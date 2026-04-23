import os
import json
import http.client
import sys

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

# 流式访问LLM API
def call_llm_stream(prompt, history, env_vars):
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
    
    # 构建消息列表，包含历史记录和当前输入
    messages = history.copy()
    messages.append({'role': 'user', 'content': prompt})
    
    data = {
        'model': model,
        'messages': messages,
        'stream': True  # 启用流式输出
    }
    
    conn.request('POST', path, json.dumps(data), headers)
    response = conn.getresponse()
    
    # 处理流式响应
    full_response = ''
    for line in response:
        line = line.decode('utf-8').strip()
        if line.startswith('data: '):
            line = line[6:]
            if line == '[DONE]':
                break
            try:
                chunk = json.loads(line)
                if 'choices' in chunk and len(chunk['choices']) > 0:
                    delta = chunk['choices'][0].get('delta', {})
                    if 'content' in delta:
                        content = delta['content']
                        print(content, end='', flush=True)  # 流式输出
                        full_response += content
            except json.JSONDecodeError:
                pass
    
    conn.close()
    print()  # 换行
    return full_response

def main():
    try:
        env_vars = load_env()
        print("环境变量加载成功")
        print("====================================")
        print("AI聊天助手")
        print("输入消息开始聊天，按Ctrl+C退出")
        print("====================================")
        
        # 初始化聊天历史
        history = []
        
        while True:
            try:
                # 获取用户输入
                prompt = input("你: ")
                
                # 调用LLM并流式输出
                print("AI: ", end='', flush=True)
                response = call_llm_stream(prompt, history, env_vars)
                
                # 更新聊天历史
                history.append({'role': 'user', 'content': prompt})
                history.append({'role': 'assistant', 'content': response})
                
                # 限制历史记录长度，避免上下文过长
                if len(history) > 10:  # 保留最近5轮对话
                    history = history[-10:]
                
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