import os
import time
import http.client
import urllib.parse
from datetime import datetime

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
                    "size": stat.st_size,  # 文件大小（字节）
                    "mtime": time.ctime(stat.st_mtime),  # 最后修改时间
                    "mode": stat.st_mode  # 文件权限模式
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
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return content
    except Exception as e:
        return f"错误：{str(e)}"

# 6. 通过curl访问网页并返回网页内容
def curl(url):
    """
    通过HTTP/HTTPS访问网页并返回网页内容
    
    Args:
        url: 网页URL地址
    
    Returns:
        网页内容或错误信息
    """
    try:
        parsed_url = urllib.parse.urlparse(url)
        
        # 获取协议、主机和路径
        scheme = parsed_url.scheme
        host = parsed_url.hostname
        port = parsed_url.port
        
        # 对路径进行URL编码，处理中文等非ASCII字符
        path = urllib.parse.quote(parsed_url.path, safe='/') if parsed_url.path else '/'
        
        # 根据协议创建连接
        if scheme == 'https':
            conn = http.client.HTTPSConnection(host, port or 443)
        elif scheme == 'http':
            conn = http.client.HTTPConnection(host, port or 80)
        else:
            return f"错误：不支持的协议 {scheme}"
        
        # 添加查询参数
        if parsed_url.query:
            path += '?' + parsed_url.query
        
        # 发送请求
        conn.request('GET', path)
        response = conn.getresponse()
        
        # 获取响应状态和内容
        status = response.status
        content = response.read().decode('utf-8', errors='ignore')
        
        conn.close()
        
        if status >= 200 and status < 300:
            return content
        else:
            return f"错误：HTTP状态码 {status}\n{content[:500]}"
    except Exception as e:
        return f"错误：{str(e)}"

# 7. 获取今天的日期
def get_date():
    """
    获取今天的日期
    
    Returns:
        今天的日期字符串，格式为YYYY-MM-DD
    """
    today = datetime.now()
    return today.strftime("%Y-%m-%d")