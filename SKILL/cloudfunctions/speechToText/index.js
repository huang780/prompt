// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  const { fileID } = event
  
  try {
    // 获取文件临时链接
    const fileList = await cloud.getTempFileURL({
      fileList: [fileID]
    })
    
    const fileUrl = fileList.fileList[0].tempFileURL
    
    // 这里应该调用微信的语音识别API
    // 由于微信小程序云开发没有内置的语音识别API，这里返回模拟数据
    // 实际项目中需要接入第三方语音识别服务（如百度语音、讯飞等）
    
    // 模拟识别结果
    const mockResults = [
      '店长让搬货20分钟',
      '临时加班处理客户投诉',
      '同事甩锅让我背责任',
      '代岗收银半小时',
      '顾客无理取闹浪费我时间'
    ]
    
    const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)]
    
    return {
      code: 0,
      text: randomResult,
      message: '识别成功'
    }
    
  } catch (err) {
    console.error('语音识别失败', err)
    return {
      code: -1,
      text: '',
      message: '识别失败'
    }
  }
}
