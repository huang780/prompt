import os
import json
import http.client
import sys
from tools import list_files, rename_file, delete_file, create_file, read_file, fetch_webpage, get_current_time, anythingllm_query, list_available_skills, load_skill_content

# 读取.env文件
def load_env():
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    env_vars = {}
    with open(env_path, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                key, value = line.split('=', 1)
                env_vars[key] = value
    return env_vars

# 链式调用上下文管理器
class ChainedCallContext:
    def __init__(self, max_iterations=5):
        self.max_iterations = max_iterations
        self.current_iteration = 0
        self.call_history = []
        self.context_variables = {}
    
    def add_call(self, tool_name, arguments, result):
        """记录工具调用和结果"""
        self.call_history.append({
            'tool_name': tool_name,
            'arguments': arguments,
            'result': result,
            'iteration': self.current_iteration
        })
    
    def get_history_summary(self):
        """获取调用历史摘要"""
        if not self.call_history:
            return "无"
        
        summary = ""
        for i, call in enumerate(self.call_history):
            summary += f"步骤{i+1}: 调用工具 '{call['tool_name']}'，参数: {json.dumps(call['arguments'], ensure_ascii=False)}，结果: {str(call['result'])[:200]}...\n"
        return summary
    
    def set_variable(self, name, value):
        """设置上下文变量"""
        self.context_variables[name] = value
    
    def get_variable(self, name, default=None):
        """获取上下文变量"""
        return self.context_variables.get(name, default)
    
    def increment_iteration(self):
        """增加迭代次数"""
        self.current_iteration += 1
    
    def is_max_iterations_reached(self):
        """检查是否达到最大迭代次数"""
        return self.current_iteration >= self.max_iterations

# 构建分析提示词
def build_analysis_prompt(user_request, context):
    """
    构建分析提示词，包含用户请求、已执行的工具调用历史和决策规则
    """
    history_summary = context.get_history_summary()
    
    prompt = f"""你是一个智能助手，需要根据用户请求和已执行的工具调用历史，决定下一步操作。
    
用户原始请求：
{user_request}

已执行的工具调用历史：
{history_summary}

上下文变量（可在参数中引用，格式为 {{variable_name}}）：
{json.dumps(context.context_variables, ensure_ascii=False, indent=2)}

决策规则：
1. 如果你已经收集到足够的信息来回答用户问题，或者任务已经完成，请返回完成状态
2. 如果需要进一步调用工具来获取更多信息，请决定调用哪个工具以及使用什么参数
3. 可以使用上下文中的变量作为工具参数，使用 {{variable_name}} 格式引用
4. 工具调用可以链式进行，前一个工具的输出可以作为后一个工具的输入

可用工具列表：
1. list_files(directory: str) - 列出某个目录下的所有文件及其基本属性
2. rename_file(directory: str, old_name: str, new_name: str) - 修改某个目录下某个文件的名字
3. delete_file(directory: str, filename: str) - 删除某个目录下的某个文件
4. create_file(directory: str, filename: str, content: str) - 在某个目录下新建1个文件，并且写入内容
5. read_file(directory: str, filename: str) - 读取某个目录下的某个文件的内容
6. get_current_time() - 获取当前的日期和时间
7. fetch_webpage(url: str) - 访问网页并返回网页内容
8. search_chat_history(query: str) - 查找聊天历史记录
9. anythingllm_query(message: str) - 访问文档仓库，查询文件仓库中的内容
10. load_skill_content(skill_name: str) - 加载技能内容

输出格式要求：
- 如果任务完成：
{{"done": true, "answer": "最终回答内容"}}

- 如果需要继续调用工具：
{{"done": false, "tool_call": {{"name": "工具名称", "arguments": {{"参数名": "参数值"}}}}}}

请严格按照JSON格式输出，不要包含其他任何文字。
"""
    
    return prompt

# 构建系统提示词（包含链式调用规则）
def get_system_prompt():
    skills = list_available_skills()
    skills_json = json.dumps({"skills": skills}, ensure_ascii=False, indent=2)
    
    return f"""你是一个智能助手，具有链式工具调用能力。

=== 链式调用规则 ===
1. 工具调用可以按顺序链式进行，前一个工具的输出可以作为后一个工具的输入参数
2. 你需要根据中间结果自主决定下一步操作：
   - 如果已获取足够信息，可以直接回答用户问题
   - 如果需要更多信息，继续调用合适的工具
3. 上下文变量系统：
   - 每次工具调用的结果会自动保存到上下文中
   - 你可以在后续工具调用中引用之前的结果
   - 使用 {{variable_name}} 格式引用上下文变量

=== 链式调用示例 ===
场景：用户想读取某个目录下的文件内容
步骤1: 调用 list_files("D:/test") 获取文件列表
步骤2: 根据返回结果，发现文件 "report.txt"
步骤3: 调用 read_file("D:/test", "report.txt") 读取文件内容
步骤4: 将文件内容总结给用户

=== 可用工具 ===
1. list_files(directory: str) - 列出某个目录下的所有文件及其基本属性
2. rename_file(directory: str, old_name: str, new_name: str) - 修改某个目录下某个文件的名字
3. delete_file(directory: str, filename: str) - 删除某个目录下的某个文件
4. create_file(directory: str, filename: str, content: str) - 在某个目录下新建1个文件，并且写入内容
5. read_file(directory: str, filename: str) - 读取某个目录下的某个文件的内容
6. get_current_time() - 获取当前的日期和时间
7. fetch_webpage(url: str) - 访问网页并返回网页内容
8. search_chat_history(query: str) - 查找聊天历史记录
9. anythingllm_query(message: str) - 访问文档仓库，查询文件仓库中的内容
10. load_skill_content(skill_name: str) - 加载技能内容

=== 可用技能列表 ===
'''
{skills_json}
'''

=== 输出格式 ===
你需要输出JSON格式的决策：
- 完成任务时：{{"done": true, "answer": "最终回答内容"}}
- 继续调用工具时：{{"done": false, "tool_call": {{"name": "工具名称", "arguments": {{"参数名": "参数值"}}}}}}

请严格按照JSON格式输出！
"""

# 访问LLM API
def call_llm(messages, env_vars):
    base_url = env_vars.get('BASE_URL')
    model = env_vars.get('MODEL')
    token = env_vars.get('TOKEN')
    
    if base_url.startswith('https://'):
        host = base_url[8:].split('/')[0]
        path = '/' + '/'.join(base_url[8:].split('/')[1:]) + '/chat/completions'
        conn = http.client.HTTPSConnection(host)
    else:
        host = base_url[7:].split('/')[0]
        path = '/' + '/'.join(base_url[7:].split('/')[1:]) + '/chat/completions'
        conn = http.client.HTTPConnection(host)
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    
    data = {
        'model': model,
        'messages': messages
    }
    
    conn.request('POST', path, json.dumps(data), headers)
    response = conn.getresponse()
    result = response.read().decode('utf-8')
    conn.close()
    
    return json.loads(result)

# 执行工具调用
def execute_tool_call(tool_call):
    tool_name = tool_call.get('name')
    params = tool_call.get('arguments', {})
    
    if tool_name == 'list_files':
        return list_files(params.get('directory', ''))
    elif tool_name == 'rename_file':
        return rename_file(
            params.get('directory', ''),
            params.get('old_name', ''),
            params.get('new_name', '')
        )
    elif tool_name == 'delete_file':
        return delete_file(
            params.get('directory', ''),
            params.get('filename', '')
        )
    elif tool_name == 'create_file':
        return create_file(
            params.get('directory', ''),
            params.get('filename', ''),
            params.get('content', '')
        )
    elif tool_name == 'read_file':
        return read_file(
            params.get('directory', ''),
            params.get('filename', '')
        )
    elif tool_name == 'fetch_webpage':
        return fetch_webpage(params.get('url', ''))
    elif tool_name == 'get_current_time':
        return get_current_time()
    elif tool_name == 'search_chat_history':
        return search_chat_history(params.get('query', ''))
    elif tool_name == 'anythingllm_query':
        env_vars = load_env()
        api_key = env_vars.get('ANYTHINGLLM_API_KEY')
        workspace_slug = env_vars.get('ANYTHINGLLM_WORKSPACE_SLUG')
        
        if not api_key:
            return "错误：未设置ANYTHINGLLM_API_KEY环境变量"
        if not workspace_slug:
            return "错误：未设置ANYTHINGLLM_WORKSPACE_SLUG环境变量"
        
        message = params.get('message', '')
        return anythingllm_query(message, api_key, workspace_slug)
    elif tool_name == 'load_skill_content':
        return load_skill_content(params.get('skill_name', ''))
    else:
        return f"错误：未知工具 {tool_name}"

# 搜索聊天历史
def search_chat_history(query):
    log_path = "c:/Users/atfa/Desktop/实验报告/log.txt"
    
    if not os.path.exists(log_path):
        return "错误：聊天历史日志文件不存在"
    
    with open(log_path, 'r', encoding='utf-8', errors='replace') as f:
        log_content = f.read()
    
    return f"[聊天历史日志内容]\n{log_content}\n[查询内容]：{query}"

# 执行链式工具调用
def execute_chained_tool_call(user_request, env_vars, max_iterations=5):
    """
    实现链式工具调用的完整流程
    
    Args:
        user_request: 用户请求
        env_vars: 环境变量
        max_iterations: 最大迭代次数
        
    Returns:
        最终回答
    """
    # 初始化上下文
    context = ChainedCallContext(max_iterations=max_iterations)
    
    # 初始化消息历史，包含系统提示词
    messages = [
        {'role': 'system', 'content': get_system_prompt()}
    ]
    
    print(f"用户请求: {user_request}")
    print("====================================")
    
    # 循环执行链式调用
    while not context.is_max_iterations_reached():
        context.increment_iteration()
        print(f"\n[迭代 {context.current_iteration}/{max_iterations}]")
        
        # 构建分析提示词
        analysis_prompt = build_analysis_prompt(user_request, context)
        messages.append({'role': 'user', 'content': analysis_prompt})
        
        # 调用LLM决定下一步操作
        try:
            response = call_llm(messages, env_vars)
            
            if 'choices' in response and len(response['choices']) > 0:
                message = response['choices'][0].get('message', {})
                content = message.get('content', '')
                
                # 解析LLM响应
                try:
                    decision = json.loads(content.strip())
                    
                    if decision.get('done', False):
                        # 任务完成
                        final_answer = decision.get('answer', '')
                        print(f"AI: {final_answer}")
                        print("\n====================================")
                        print("任务完成！")
                        return final_answer
                    else:
                        # 需要继续调用工具
                        tool_call = decision.get('tool_call', {})
                        tool_name = tool_call.get('name')
                        arguments = tool_call.get('arguments', {})
                        
                        print(f"工具调用: {tool_name}")
                        print(f"参数: {json.dumps(arguments, ensure_ascii=False)}")
                        
                        # 执行工具调用
                        tool_result = execute_tool_call(tool_call)
                        print(f"执行结果: {str(tool_result)[:300]}{'...' if len(str(tool_result)) > 300 else ''}")
                        
                        # 记录到上下文
                        context.add_call(tool_name, arguments, tool_result)
                        
                        # 保存结果到上下文变量
                        context.set_variable(f"last_tool_result", tool_result)
                        context.set_variable(f"tool_{tool_name}_result", tool_result)
                        
                        # 将工具执行结果添加到消息历史
                        messages.append({'role': 'assistant', 'content': content})
                        messages.append({'role': 'user', 'content': json.dumps({"tool_result": tool_result})})
                        
                except json.JSONDecodeError:
                    # 如果不是JSON格式，直接返回内容
                    print(f"AI: {content}")
                    return content
                    
        except Exception as e:
            print(f"调用LLM失败: {e}")
            return f"处理请求时发生错误: {e}"
    
    # 达到最大迭代次数
    print("\n====================================")
    print(f"已达到最大迭代次数 ({max_iterations})，任务终止")
    return f"任务在 {max_iterations} 次迭代后终止。已执行的步骤：\n{context.get_history_summary()}"

def main():
    try:
        env_vars = load_env()
        print("环境变量加载成功")
        print("====================================")
        print("AI聊天助手（支持链式工具调用）")
        print("输入消息开始聊天，按Ctrl+C退出")
        print("====================================")
        
        while True:
            try:
                prompt = input("你: ")
                
                # 检查是否需要搜索聊天历史
                if prompt.startswith('/search') or '查找聊天历史' in prompt:
                    query = prompt[7:] if prompt.startswith('/search') else prompt
                    search_result = search_chat_history(query)
                    print(f"聊天历史搜索结果: {search_result}")
                    continue
                
                # 执行链式工具调用
                result = execute_chained_tool_call(prompt, env_vars)
                
            except KeyboardInterrupt:
                print("\n====================================")
                print("聊天结束")
                print("====================================")
                break
    except Exception as e:
        print(f"错误: {e}")
        print("请确保已创建.env文件并填写正确的配置信息")

if __name__ == '__main__':
    main()
