// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { reminderTime } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  try {
    // 更新用户设置中的提醒时间
    const settingsRes = await db.collection('settings')
      .where({ openid })
      .get()
    
    if (settingsRes.data.length > 0) {
      await db.collection('settings').doc(settingsRes.data[0]._id).update({
        data: {
          reminderTime,
          updateTime: db.serverDate()
        }
      })
    }
    
    return {
      code: 0,
      message: '更新成功'
    }
    
  } catch (err) {
    console.error('更新提醒时间失败', err)
    return {
      code: -1,
      message: '更新失败'
    }
  }
}
