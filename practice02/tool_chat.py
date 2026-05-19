import os
import json
import http.client
import sys
from tools import list_files, rename_file, delete_file, create_file, read_file, curl, get_date

# 读取.env文件
def load_env():
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    env_vars = {}
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                key, value = line.split('=', 1)
                env_vars[key] = value
    return env_vars

# 构建系统提示词
def get_system_prompt():
    today = get_date()
    return f"""你是一个智能助手，具有以下工具调用能力：

当前日期：{today}

可用工具：
1. list_files(directory: str) - 列出某个目录下的所有文件及其基本属性
2. rename_file(directory: str, old_name: str, new_name: str) - 修改某个目录下某个文件的名字
3. delete_file(directory: str, filename: str) - 删除某个目录下的某个文件
4. create_file(directory: str, filename: str, content: str) - 在某个目录下新建1个文件，并且写入内容
5. read_file(directory: str, filename: str) - 读取某个目录下的某个文件的内容
6. curl(url: str) - 通过HTTP/HTTPS访问网页并返回网页内容
7. get_date() - 获取今天的日期

当需要使用工具时，请以JSON格式输出工具调用请求，格式如下：
{{"toolcall": {{"name": "工具名称", "params": {{"参数1": "值1", "参数2": "值2"}}}}}}

当工具执行完成后，我会返回工具执行结果，格式如下：
{{"toolresult": "工具执行结果"}}

请根据用户的需求，决定是否需要调用工具。"""

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

# 执行工具调用
def execute_tool_call(tool_call):
    tool_name = tool_call.get('name')
    params = tool_call.get('params', {})
    
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
    elif tool_name == 'curl':
        return curl(params.get('url', ''))
    elif tool_name == 'get_date':
        return get_date()
    else:
        return f"错误：未知工具 {tool_name}"

def main():
    try:
        env_vars = load_env()
        print("环境变量加载成功")
        print("====================================")
        print("AI聊天助手（支持工具调用）")
        print("输入消息开始聊天，按Ctrl+C退出")
        print("====================================")
        
        # 初始化聊天历史，包含系统提示词
        history = [
            {'role': 'system', 'content': get_system_prompt()}
        ]
        
        while True:
            try:
                # 获取用户输入
                prompt = input("你: ")
                
                # 添加用户消息到历史
                history.append({'role': 'user', 'content': prompt})
                
                # 调用LLM
                print("AI: ", end='', flush=True)
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
                                print(f"执行结果: {tool_result}")
                                
                                # 将工具执行结果添加到历史
                                history.append({'role': 'assistant', 'content': content})
                                history.append({'role': 'user', 'content': json.dumps({"toolresult": tool_result})})
                                
                                # 再次调用LLM获取最终响应
                                response = call_llm(history, env_vars)
                                if 'choices' in response and len(response['choices']) > 0:
                                    message = response['choices'][0].get('message', {})
                                    content = message.get('content', '')
                                    print(content)
                        except json.JSONDecodeError:
                            print(content)
                    else:
                        print(content)
                    
                    # 更新聊天历史
                    history.append({'role': 'assistant', 'content': content})
                
                # 限制历史记录长度，避免上下文过长
                if len(history) > 12:  # 保留系统提示词和最近5轮对话
                    history = history[:1] + history[-11:]
                
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