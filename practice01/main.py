import os
import json
import http.client

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

# 访问LLM API
def call_llm(prompt, env_vars):
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
        'messages': [
            {'role': 'user', 'content': prompt}
        ]
    }
    
    conn.request('POST', path, json.dumps(data), headers)
    response = conn.getresponse()
    result = response.read().decode('utf-8')
    conn.close()
    
    return result

if __name__ == '__main__':
    try:
        env_vars = load_env()
        print("环境变量加载成功:")
        print(f"BASE_URL: {env_vars.get('BASE_URL')}")
        print(f"MODEL: {env_vars.get('MODEL')}")
        
        prompt = "Hello, how are you?"
        print(f"\n发送请求: {prompt}")
        response = call_llm(prompt, env_vars)
        print(f"\n响应结果:")
        print(response)
    except Exception as e:
        print(f"错误: {e}")
        print("请确保已创建.env文件并填写正确的配置信息")