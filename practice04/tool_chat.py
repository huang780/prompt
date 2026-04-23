import os
import json
import http.client
import sys
from tools import list_files, rename_file, delete_file, create_file, read_file, fetch_webpage, get_current_time

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

当需要使用工具时，请以JSON格式输出工具调用请求，格式如下：
{"toolcall": {"name": "工具名称", "params": {"参数1": "值1", "参数2": "值2"}}}

当工具执行完成后，我会返回工具执行结果，格式如下：
{"toolresult": "工具执行结果"}

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
    elif tool_name == 'fetch_webpage':
        return fetch_webpage(params.get('url', ''))
    elif tool_name == 'get_current_time':
        return get_current_time()
    elif tool_name == 'search_chat_history':
        return search_chat_history(params.get('query', ''))
    else:
        return f"错误：未知工具 {tool_name}"

# 计算聊天上下文长度
def calculate_context_length(history):
    total_length = 0
    for message in history:
        if 'content' in message:
            total_length += len(message['content'])
    return total_length

# 压缩聊天历史记录
def compress_chat_history(history, env_vars):
    # 分离系统提示词和聊天记录
    system_message = history[0] if history else None
    chat_messages = history[1:] if len(history) > 1 else []
    
    if not chat_messages:
        return history
    
    # 计算分割点（前70%压缩，后30%保留）
    split_point = int(len(chat_messages) * 0.7)
    messages_to_compress = chat_messages[:split_point]
    messages_to_keep = chat_messages[split_point:]
    
    if not messages_to_compress:
        return history
    
    # 构建压缩提示词
    compress_prompt = """请将以下聊天记录压缩成简洁的摘要，保留关键信息：

%s

摘要："""
    
    # 构建要压缩的消息文本
    compress_text = ""
    for msg in messages_to_compress:
        role = "用户" if msg['role'] == 'user' else "助手"
        compress_text += f"{role}: {msg['content']}\n"
    
    # 调用LLM进行压缩
    compress_messages = [
        {"role": "user", "content": compress_prompt % compress_text}
    ]
    
    try:
        response = call_llm(compress_messages, env_vars)
        if 'choices' in response and len(response['choices']) > 0:
            summary = response['choices'][0].get('message', {}).get('content', '')
            
            # 构建压缩后的历史记录
            compressed_history = [system_message]
            compressed_history.append({
                "role": "assistant",
                "content": f"[聊天记录摘要]：{summary}"
            })
            compressed_history.extend(messages_to_keep)
            
            return compressed_history
    except Exception as e:
        print(f"压缩聊天记录失败: {e}")
    
    return history

# 提取关键信息（5W规则）
def extract_key_information(chat_messages):
    if not chat_messages:
        return []
    
    # 构建提取提示词
    extract_prompt = """请从以下聊天记录中提取关键信息，按照5W规则（谁Who、做了什么事What、什么时候When、在何处Where、为什么要做这个事Why）进行提取。
对于每条关键信息，格式化为：
- Who: [人物]
- What: [事件]
- When: [时间]（可选）
- Where: [地点]（可选）
- Why: [原因]（可选）

%s

关键信息："""
    
    # 构建聊天记录文本
    chat_text = ""
    for msg in chat_messages:
        role = "用户" if msg['role'] == 'user' else "助手"
        chat_text += f"{role}: {msg['content']}\n"
    
    return extract_prompt % chat_text

# 写入日志文件
def write_log(log_content):
    log_path = "c:/Users/atfa/Desktop/实验报告"
    log_file = os.path.join(log_path, "log.txt")
    
    # 创建目录
    if not os.path.exists(log_path):
        os.makedirs(log_path)
    
    # 写入日志
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(f"[记录时间]：{get_current_time()}\n")
        f.write(log_content)
        f.write("\n" + "="*50 + "\n")

# 搜索聊天历史
def search_chat_history(query):
    log_path = "c:/Users/atfa/Desktop/实验报告/log.txt"
    
    if not os.path.exists(log_path):
        return "错误：聊天历史日志文件不存在"
    
    # 读取日志文件
    with open(log_path, 'r', encoding='utf-8') as f:
        log_content = f.read()
    
    return f"[聊天历史日志内容]\n{log_content}\n[查询内容]：{query}"

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
        
        chat_count = 0
        
        while True:
            try:
                # 获取用户输入
                prompt = input("你: ")
                
                # 检查是否需要搜索聊天历史
                if prompt.startswith('/search') or '查找聊天历史' in prompt:
                    # 提取查询内容
                    query = prompt[7:] if prompt.startswith('/search') else prompt
                    # 调用搜索工具
                    search_result = search_chat_history(query)
                    print(f"聊天历史搜索结果: {search_result}")
                    continue
                
                # 添加用户消息到历史
                history.append({'role': 'user', 'content': prompt})
                
                # 检查是否需要压缩聊天历史
                context_length = calculate_context_length(history)
                if len(history) > 12 or context_length > 3000:
                    history = compress_chat_history(history, env_vars)
                    print("[系统]：聊天历史已压缩")
                
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
                
                # 每5次聊天提取关键信息
                chat_count += 1
                if chat_count % 5 == 0:
                    # 提取最近的聊天记录
                    recent_chats = history[-10:]  # 最近5轮对话
                    extract_prompt = extract_key_information(recent_chats)
                    
                    # 调用LLM提取关键信息
                    extract_messages = [
                        {"role": "user", "content": extract_prompt}
                    ]
                    
                    try:
                        extract_response = call_llm(extract_messages, env_vars)
                        if 'choices' in extract_response and len(extract_response['choices']) > 0:
                            key_info = extract_response['choices'][0].get('message', {}).get('content', '')
                            write_log(key_info)
                            print("[系统]：关键信息已提取并记录")
                    except Exception as e:
                        print(f"提取关键信息失败: {e}")
                
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