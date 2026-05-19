// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 获取当前时间
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
    
    // 查找设置了当前时间提醒的用户
    const settingsRes = await db.collection('settings')
      .where({
        reminderTime: currentTime
      })
      .get()
    
    const settings = settingsRes.data
    
    // 为每个用户发送提醒
    for (const setting of settings) {
      const openid = setting.openid
      
      // 获取用户今天的记录数
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      
      const tasksRes = await db.collection('tasks')
        .where({
          openid,
          isDeleted: false,
          createTime: _.gte(today).and(_.lt(tomorrow))
        })
        .get()
      
      const tasks = tasksRes.data
      const totalMinutes = tasks.reduce((sum, task) => sum + task.minutes, 0)
      
      // 发送服务通知
      try {
        await cloud.openapi.subscribeMessage.send({
          touser: openid,
          templateId: 'YOUR_TEMPLATE_ID', // 需要替换为实际的模板ID
          data: {
            thing1: {
              value: `今日共记录了 ${tasks.length} 件小事`
            },
            time2: {
              value: `${totalMinutes} 分钟`
            },
            thing3: {
              value: '请点击前往清理未完成项'
            }
          },
          miniprogramState: 'developer'
        })
        
        console.log(`提醒发送成功: ${openid}`)
        
      } catch (err) {
        console.error(`提醒发送失败: ${openid}`, err)
      }
    }
    
    return {
      code: 0,
      message: `成功发送 ${settings.length} 条提醒`,
      sentCount: settings.length
    }
    
  } catch (err) {
    console.error('发送提醒失败', err)
    return {
      code: -1,
      message: '发送失败',
      sentCount: 0
    }
  }
}
