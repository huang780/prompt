import os
import json
import http.client
from tools import list_available_skills, load_skill_content

# 读取.env文件
def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    env_vars = {}
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                key, value = line.split('=', 1)
                env_vars[key] = value
    return env_vars

# 访问LLM API
def call_llm(messages, env_vars):
    base_url = env_vars.get('BASE_URL')
    model = env_vars.get('MODEL')
    token = env_vars.get('TOKEN')
    
    # 从base_url中提取主机和路径
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

# 构建系统提示词
def get_system_prompt():
    # 读取技能列表
    skills = list_available_skills()
    skills_json = json.dumps({"skills": skills}, ensure_ascii=False, indent=2)
    
    return """你是一个智能助手，具有以下工具调用能力：

可用工具：
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

当用户提到"文档仓库"、"文件仓库"、"仓库"时，请使用anythingllm_query工具进行查询。

当需要使用技能时，请使用load_skill_content工具加载技能内容，然后按照技能要求执行。

当需要使用工具时，请以JSON格式输出工具调用请求，格式如下：
{"toolcall": {"name": "工具名称", "params": {"参数1": "值1", "参数2": "值2"}}}

当工具执行完成后，我会返回工具执行结果，格式如下：
{"toolresult": "工具执行结果"}

请根据用户的需求，决定是否需要调用工具。

可用技能列表：
'''
""" + skills_json + """
'''
"""

# 执行工具调用
def execute_tool_call(tool_call):
    tool_name = tool_call.get('name')
    params = tool_call.get('params', {})
    
    if tool_name == 'load_skill_content':
        return load_skill_content(params.get('skill_name', ''))
    else:
        return f"错误：未知工具 {tool_name}"

# 测试场景1：用户不说自己所在的部门，要求撰写关于五一节放假的通知
def test_scenario1():
    print("测试场景1：用户不说自己所在的部门，要求撰写关于五一节放假的通知")
    print("====================================")
    
    env_vars = load_env()
    
    # 初始化聊天历史，包含系统提示词
    history = [
        {'role': 'system', 'content': get_system_prompt()}
    ]
    
    # 添加用户消息
    user_message = "请帮我撰写一份关于五一节放假的通知"
    history.append({'role': 'user', 'content': user_message})
    
    # 调用LLM
    response = call_llm(history, env_vars)
    
    # 处理LLM响应
    if 'choices' in response and len(response['choices']) > 0:
        message = response['choices'][0].get('message', {})
        content = message.get('content', '')
        
        # 检查是否为工具调用请求
        if content and content.strip().startswith('{"toolcall":'):
            try:
                tool_call = json.loads(content.strip())
                if 'toolcall' in tool_call:
                    # 执行工具调用
                    tool_result = execute_tool_call(tool_call['toolcall'])
                    print(f"工具调用: {tool_call['toolcall']['name']}")
                    print(f"执行结果: 技能内容已加载")
                    
                    # 将工具执行结果添加到历史
                    history.append({'role': 'assistant', 'content': content})
                    history.append({'role': 'user', 'content': json.dumps({"toolresult": tool_result})})
                    
                    # 再次调用LLM获取最终响应
                    response = call_llm(history, env_vars)
                    if 'choices' in response and len(response['choices']) > 0:
                        message = response['choices'][0].get('message', {})
                        content = message.get('content', '')
                        print(f"AI响应: {content}")
                        
                        # 验证结果
                        if content.startswith('XX部通知'):
                            print("✓ 测试通过：通知以'XX部通知'开头")
                        else:
                            print("✗ 测试失败：通知未以'XX部通知'开头")
            except json.JSONDecodeError:
                print(f"AI响应: {content}")
        else:
            print(f"AI响应: {content}")
    
    print("====================================")

# 测试场景2：用户表明自己的部门是“销售部”，要求撰写关于五一节放假的通知
def test_scenario2():
    print("测试场景2：用户表明自己的部门是'销售部'，要求撰写关于五一节放假的通知")
    print("====================================")
    
    env_vars = load_env()
    
    # 初始化聊天历史，包含系统提示词
    history = [
        {'role': 'system', 'content': get_system_prompt()}
    ]
    
    # 添加用户消息
    user_message = "我是销售部的，请帮我撰写一份关于五一节放假的通知"
    history.append({'role': 'user', 'content': user_message})
    
    # 调用LLM
    response = call_llm(history, env_vars)
    
    # 处理LLM响应
    if 'choices' in response and len(response['choices']) > 0:
        message = response['choices'][0].get('message', {})
        content = message.get('content', '')
        
        # 检查是否为工具调用请求
        if content and content.strip().startswith('{"toolcall":'):
            try:
                tool_call = json.loads(content.strip())
                if 'toolcall' in tool_call:
                    # 执行工具调用
                    tool_result = execute_tool_call(tool_call['toolcall'])
                    print(f"工具调用: {tool_call['toolcall']['name']}")
                    print(f"执行结果: 技能内容已加载")
                    
                    # 将工具执行结果添加到历史
                    history.append({'role': 'assistant', 'content': content})
                    history.append({'role': 'user', 'content': json.dumps({"toolresult": tool_result})})
                    
                    # 再次调用LLM获取最终响应
                    response = call_llm(history, env_vars)
                    if 'choices' in response and len(response['choices']) > 0:
                        message = response['choices'][0].get('message', {})
                        content = message.get('content', '')
                        print(f"AI响应: {content}")
                        
                        # 验证结果
                        if content.startswith('销售部通知'):
                            print("✓ 测试通过：通知以'销售部通知'开头")
                        else:
                            print("✗ 测试失败：通知未以'销售部通知'开头")
            except json.JSONDecodeError:
                print(f"AI响应: {content}")
        else:
            print(f"AI响应: {content}")
    
    print("====================================")

if __name__ == '__main__':
    test_scenario1()
    test_scenario2()
