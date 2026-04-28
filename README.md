# AI智能体开发教学项目

## 项目结构

```
├── .gitignore          # Git忽略文件
├── env.example         # 环境变量配置模板
├── venv/               # 虚拟环境
├── practice01/         # 练习目录1
│   ├── main.py         # 基础LLM访问示例
│   └── chat.py         # 交互式聊天示例
├── practice02/         # 练习目录2
│   ├── tools.py        # 工具函数实现（文件操作）
│   └── tool_chat.py    # 工具调用聊天示例
├── practice03/         # 练习目录3
│   ├── tools.py        # 工具函数实现（文件操作+网络访问）
│   └── tool_chat.py    # 工具调用聊天示例（支持网络访问）
├── practice04/         # 练习目录4
│   ├── tools.py        # 工具函数实现（文件操作+网络访问+时间功能）
│   └── tool_chat.py    # 工具调用聊天示例（支持历史压缩、关键信息提取、历史查询）
├── practice05/         # 练习目录5
│   ├── tools.py        # 工具函数实现（继承practice04的所有功能）
│   └── tool_chat.py    # 工具调用聊天示例（集成AnythingLLM）
├── practice06/         # 练习目录6
│   ├── tools.py        # 工具函数实现（继承practice05的所有功能，添加技能管理）
│   ├── tool_chat.py    # 工具调用聊天示例（支持技能调用）
│   ├── test_skill.py   # 技能测试脚本
│   └── .agents/        # 技能目录
│       └── skills/     # 技能存储目录
│           └── notice/ # 通知技能
│               └── SKILL.md # 通知技能定义
```

## 代码功能说明

### practice01/main.py
- **功能**：基础LLM访问示例
- **教学目标**：
  - 学习如何读取环境变量配置
  - 学习使用Python标准http库发送HTTP请求
  - 了解LLM API的基本调用方式
- **实现内容**：
  - 从项目根目录读取.env文件
  - 解析环境变量（BASE_URL、MODEL、TOKEN）
  - 根据BASE_URL构建HTTP/HTTPS连接
  - 发送请求到LLM API的chat/completions端点
  - 打印响应结果

### practice01/chat.py
- **功能**：交互式聊天示例
- **教学目标**：
  - 学习如何实现交互式命令行界面
  - 学习如何处理流式输出
  - 学习如何维护聊天历史记录
  - 学习如何处理用户输入和异常
- **实现内容**：
  - 支持终端界面输入聊天内容
  - 支持流式输出（逐字显示）
  - 支持历史聊天记录自动添加到上下文
  - 循环运行直到用户按Ctrl+C退出

### practice02/tools.py
- **功能**：工具函数实现
- **教学目标**：
  - 学习如何实现文件操作功能
  - 学习如何处理异常情况
  - 学习如何返回结构化的结果
- **实现内容**：
  - list_files：列出目录下的文件及其属性
  - rename_file：修改文件名称
  - delete_file：删除文件
  - create_file：创建新文件并写入内容
  - read_file：读取文件内容

### practice02/tool_chat.py
- **功能**：工具调用聊天示例
- **教学目标**：
  - 学习如何实现LLM工具调用
  - 学习如何构建系统提示词
  - 学习如何处理工具调用请求和响应
  - 学习如何集成工具函数到聊天系统
- **实现内容**：
  - 构建包含工具调用能力的系统提示词
  - 处理LLM的工具调用请求
  - 执行工具调用并返回结果
  - 将工具执行结果添加到上下文
  - 支持循环聊天直到用户退出

### practice03/tools.py
- **功能**：工具函数实现（扩展网络访问和时间功能）
- **教学目标**：
  - 学习如何实现网络访问功能
  - 学习如何使用Python标准库处理HTTP/HTTPS请求
  - 学习如何处理URL解析和异常情况
  - 学习如何获取当前日期时间
  - 复习文件操作功能的实现
- **实现内容**：
  - 继承practice02的所有文件操作功能
  - get_current_time：获取当前日期和时间
  - fetch_webpage：访问网页并返回网页内容
  - 支持HTTP和HTTPS协议
  - 使用ssl模块处理安全连接

### practice03/tool_chat.py
- **功能**：工具调用聊天示例（支持网络访问和时间功能）
- **教学目标**：
  - 学习如何扩展工具调用系统
  - 学习如何在现有工具系统上添加新功能
  - 复习工具调用流程和系统提示词构建
- **实现内容**：
  - 集成时间工具get_current_time
  - 集成网络访问工具fetch_webpage
  - 更新系统提示词包含新工具说明
  - 更新execute_tool_call函数处理新工具
  - 支持用户请求获取当前时间或访问网页内容

### practice04/tools.py
- **功能**：工具函数实现（继承practice03的所有功能）
- **教学目标**：
  - 复习文件操作、网络访问和时间功能的实现
  - 学习如何构建完整的工具系统
- **实现内容**：
  - 继承practice03的所有功能
  - 为practice04提供工具函数支持

### practice04/tool_chat.py
- **功能**：工具调用聊天示例（支持历史压缩、关键信息提取、历史查询）
- **教学目标**：
  - 学习如何管理和压缩聊天历史记录
  - 学习如何提取和记录关键信息
  - 学习如何实现聊天历史查询功能
  - 学习如何构建更复杂的聊天系统
- **实现内容**：
  - 聊天历史压缩：超过5轮或3k字符时自动压缩前70%内容
  - 关键信息提取：每5次聊天按5W规则提取信息并记录
  - 聊天历史查询：支持/search命令和自然语言查询
  - 日志记录：自动创建目录和文件，增量更新关键信息
  - 集成search_chat_history工具

### practice05/tools.py
- **功能**：工具函数实现（继承practice04的所有功能）
- **教学目标**：
  - 复习文件操作、网络访问和时间功能的实现
  - 学习如何集成外部API（AnythingLLM）
- **实现内容**：
  - 继承practice04的所有功能
  - anythingllm_query：访问AnythingLLM的聊天API接口
  - 使用subprocess调用curl命令发送HTTP请求
  - 处理API响应和错误情况

### practice05/tool_chat.py
- **功能**：工具调用聊天示例（集成AnythingLLM）
- **教学目标**：
  - 学习如何集成外部文档仓库查询功能
  - 学习如何在系统提示词中添加新工具说明
  - 复习工具调用流程和系统提示词构建
- **实现内容**：
  - 集成anythingllm_query工具
  - 更新系统提示词包含新工具说明
  - 更新execute_tool_call函数处理新工具
  - 支持用户查询文档仓库内容

### practice06/tools.py
- **功能**：工具函数实现（继承practice05的所有功能，添加技能管理）
- **教学目标**：
  - 学习如何实现技能管理功能
  - 学习如何读取和解析YAML front matter
  - 学习如何加载和管理技能内容
- **实现内容**：
  - 继承practice05的所有功能
  - list_available_skills：读取技能列表，提取name和description字段
  - load_skill_content：加载技能正文内容
  - 支持从.agents/skills目录读取技能定义
  - 解析SKILL.md文件的YAML front matter

### practice06/tool_chat.py
- **功能**：工具调用聊天示例（支持技能调用）
- **教学目标**：
  - 学习如何实现技能调用系统
  - 学习如何在系统提示词中包含技能列表
  - 学习如何处理技能调用请求和响应
- **实现内容**：
  - 集成load_skill_content工具
  - 更新系统提示词包含技能列表（JSON格式）
  - 更新execute_tool_call函数处理技能加载
  - 支持LLM根据用户需求调用相应技能

### practice06/test_skill.py
- **功能**：技能测试脚本
- **教学目标**：
  - 学习如何测试技能调用功能
  - 学习如何模拟用户请求
  - 学习如何验证技能执行结果
- **实现内容**：
  - 测试场景1：用户不说自己所在的部门，要求撰写关于五一节放假的通知
  - 测试场景2：用户表明自己的部门是"销售部"，要求撰写关于五一节放假的通知
  - 验证通知是否以正确的部门前缀开头
  - 模拟工具调用流程和LLM响应处理

## 环境配置

1. 复制 `env.example` 为 `.env` 文件
2. 填写正确的配置信息：
   - BASE_URL：OpenAI兼容协议的LLM API地址
   - MODEL：使用的模型名称
   - TOKEN：API访问令牌

## 运行示例

1. 激活虚拟环境：
   ```bash
   venv\Scripts\activate
   ```

2. 运行基础示例：
   ```bash
   python practice01\main.py
   ```

3. 运行交互式聊天示例：
   ```bash
   python practice01\chat.py
   ```

4. 运行工具调用聊天示例：
   ```bash
   python practice02\tool_chat.py
   ```

5. 运行支持网络访问的工具调用聊天示例：
   ```bash
   python practice03\tool_chat.py
   ```

6. 运行支持历史压缩、关键信息提取和历史查询的工具调用聊天示例：
   ```bash
   python practice04\tool_chat.py
   ```

7. 运行集成AnythingLLM的工具调用聊天示例：
   ```bash
   python practice05\tool_chat.py
   ```

8. 运行支持技能调用的工具调用聊天示例：
   ```bash
   python practice06\tool_chat.py
   ```

9. 运行技能测试脚本：
   ```bash
   python practice06\test_skill.py
   ```