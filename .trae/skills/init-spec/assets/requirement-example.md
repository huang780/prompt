# 小事清 - API 文档 (api.md)

## 1. 文档说明
- **版本**：v1.0
- **更新日期**：2026-05-09
- **后端技术**：微信小程序云开发（Node.js 12+）
- **数据库**：云数据库（JSON 文档型）
- **云存储**：云存储（图片、录音文件）

## 2. 通用约定

### 2.1 请求格式
所有云函数通过 `wx.cloud.callFunction` 调用，请求体为 JSON 对象，必须包含：

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `action` | string | 是 | 云函数内子动作（用于一个云函数处理多个业务） |

示例：
```javascript
wx.cloud.callFunction({
  name: 'tasks',
  data: { action: 'add', content: '...', minutes: 10, tags: ['#加活'] }
})