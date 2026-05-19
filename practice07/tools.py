import os
import time
import http.client
import urllib.parse
import ssl
from datetime import datetime
import yaml

# 1. 列出某个目录下有哪些文件（包括文件的基本属性、大小等信息）
def list_files(directory):
    """
    列出目录下的所有文件及其基本属性
    
    Args:
        directory: 目录路径
    
    Returns:
        包含文件信息的列表
    """
    try:
        if not os.path.exists(directory):
            return f"错误：目录 {directory} 不存在"
        
        if not os.path.isdir(directory):
            return f"错误：{directory} 不是一个目录"
        
        files = []
        for filename in os.listdir(directory):
            filepath = os.path.join(directory, filename)
            if os.path.isfile(filepath):
                stat = os.stat(filepath)
                files.append({
                    "name": filename,
                    "size": stat.st_size,
                    "mtime": time.ctime(stat.st_mtime),
                    "mode": stat.st_mode
                })
            elif os.path.isdir(filepath):
                files.append({
                    "name": filename,
                    "type": "directory"
                })
        
        return files
    except Exception as e:
        return f"错误：{str(e)}"

# 2. 修改某个目录下某个文件的名字
def rename_file(directory, old_name, new_name):
    """
    修改目录下文件的名字
    
    Args:
        directory: 目录路径
        old_name: 旧文件名
        new_name: 新文件名
    
    Returns:
        操作结果
    """
    try:
        old_path = os.path.join(directory, old_name)
        new_path = os.path.join(directory, new_name)
        
        if not os.path.exists(old_path):
            return f"错误：文件 {old_path} 不存在"
        
        if os.path.exists(new_path):
            return f"错误：文件 {new_path} 已存在"
        
        os.rename(old_path, new_path)
        return f"成功：文件已重命名为 {new_name}"
    except Exception as e:
        return f"错误：{str(e)}"

# 3. 删除某个目录下的某个文件
def delete_file(directory, filename):
    """
    删除目录下的文件
    
    Args:
        directory: 目录路径
        filename: 文件名
    
    Returns:
        操作结果
    """
    try:
        filepath = os.path.join(directory, filename)
        
        if not os.path.exists(filepath):
            return f"错误：文件 {filepath} 不存在"
        
        if not os.path.isfile(filepath):
            return f"错误：{filepath} 不是一个文件"
        
        os.remove(filepath)
        return f"成功：文件已删除"
    except Exception as e:
        return f"错误：{str(e)}"

# 4. 在某个目录下新建1个文件，并且写入内容
def create_file(directory, filename, content):
    """
    在目录下创建新文件并写入内容
    
    Args:
        directory: 目录路径
        filename: 文件名
        content: 文件内容
    
    Returns:
        操作结果
    """
    try:
        if not os.path.exists(directory):
            return f"错误：目录 {directory} 不存在"
        
        if not os.path.isdir(directory):
            return f"错误：{directory} 不是一个目录"
        
        filepath = os.path.join(directory, filename)
        
        if os.path.exists(filepath):
            return f"错误：文件 {filepath} 已存在"
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return f"成功：文件已创建"
    except Exception as e:
        return f"错误：{str(e)}"

# 5. 读取某个目录下的某个文件的内容
def read_file(directory, filename):
    """
    读取目录下文件的内容
    
    Args:
        directory: 目录路径
        filename: 文件名
    
    Returns:
        文件内容或错误信息
    """
    try:
        filepath = os.path.join(directory, filename)
        
        if not os.path.exists(filepath):
            return f"错误：文件 {filepath} 不存在"
        
        if not os.path.isfile(filepath):
            return f"错误：{filepath} 不是一个文件"
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(filepath, 'r', encoding='gbk', errors='replace') as f:
                content = f.read()
        
        return content
    except Exception as e:
        return f"错误：{str(e)}"

def get_current_time():
    """
    获取当前日期和时间
    
    Returns:
        当前日期和时间字符串
    """
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# 7. 访问网页并返回内容
def fetch_webpage(url):
    """
    访问网页并返回网页内容
    
    Args:
        url: 网页URL
    
    Returns:
        网页内容或错误信息
    """
    try:
        parsed = urllib.parse.urlparse(url)
        
        if parsed.scheme == 'https':
            context = ssl.create_default_context()
            conn = http.client.HTTPSConnection(parsed.netloc, context=context)
        else:
            conn = http.client.HTTPConnection(parsed.netloc)
        
        path = parsed.path if parsed.path else '/'
        if parsed.query:
            path += '?' + parsed.query
        
        conn.request('GET', path)
        response = conn.getresponse()
        
        content = response.read().decode('utf-8', errors='replace')
        conn.close()
        
        return content
    except Exception as e:
        return f"错误：{str(e)}"

# 8. 访问AnythingLLM API
def anythingllm_query(message,api_key, workspace_slug):
    """
    访问AnythingLLM的聊天API接口
    
    Args:
        message: 查询消息
        api_key: API密钥
        workspace_slug: 工作区标识符
    
    Returns:
        API响应内容或错误信息
    """
    try:
        import subprocess
        import json
        
        url = f"http://localhost:3001/api/v1/workspace/{workspace_slug}/chat"
        
        data = json.dumps({
            "message": message
        }, ensure_ascii=False)
        
        cmd = [
            "curl",
            "-X", "POST",
            url,
            "-H", f"Authorization: Bearer {api_key}",
            "-H", "Content-Type: application/json",
            "-d", data
        ]
        
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        if result.returncode != 0:
            return f"错误：curl执行失败 - {result.stderr.decode('utf-8', errors='replace')}"
        
        return result.stdout.decode('utf-8', errors='replace')
    except Exception as e:
        return f"错误：{str(e)}"

# 读取技能列表
def list_available_skills():
    """
    读取技能列表
    
    Returns:
        技能列表，每个技能包含name和description字段
    """
    try:
        skills_dir = "D:\\AI\\prompt\\.agents\\skills"
        if not os.path.exists(skills_dir):
            return []
        
        skills = []
        for skill_name in os.listdir(skills_dir):
            skill_path = os.path.join(skills_dir, skill_name)
            if os.path.isdir(skill_path):
                skill_file = os.path.join(skill_path, "SKILL.md")
                if os.path.exists(skill_file):
                    try:
                        with open(skill_file, 'r', encoding='utf-8') as f:
                            content = f.read()
                    except UnicodeDecodeError:
                        with open(skill_file, 'r', encoding='gbk', errors='replace') as f:
                            content = f.read()
                    if content.startswith('---'):
                        front_matter_end = content.find('---', 3)
                        if front_matter_end != -1:
                            front_matter = content[3:front_matter_end].strip()
                            try:
                                data = yaml.safe_load(front_matter)
                                if 'name' in data and 'description' in data:
                                    skills.append({
                                        'name': data['name'],
                                        'description': data['description']
                                    })
                            except yaml.YAMLError:
                                pass
        
        return skills
    except Exception as e:
        print(f"读取技能列表失败: {e}")
        return []

# 读取技能正文
def load_skill_content(skill_name):
    """
    读取技能正文内容
    
    Args:
        skill_name: 技能名称
    
    Returns:
        技能正文内容或错误信息
    """
    try:
        skill_path = os.path.join("D:\\AI\\prompt\\.agents\\skills", skill_name)
        skill_file = os.path.join(skill_path, "SKILL.md")
        
        if not os.path.exists(skill_file):
            return f"错误：技能文件 {skill_file} 不存在"
        
        try:
            with open(skill_file, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(skill_file, 'r', encoding='gbk', errors='replace') as f:
                content = f.read()
        
        if content.startswith('---'):
            front_matter_end = content.find('---', 3)
            if front_matter_end != -1:
                return content[front_matter_end+3:].strip()
        
        return content
    except Exception as e:
        return f"错误：{str(e)}"
