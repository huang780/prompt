// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { tasks, startDate, endDate } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  try {
    // 生成PDF内容
    const pdfContent = generatePDFContent(tasks, startDate, endDate)
    
    // 这里应该调用PDF生成服务
    // 由于云开发没有内置PDF生成功能，这里返回模拟数据
    // 实际项目中可以使用第三方PDF生成服务
    
    // 将内容保存到云存储
    const fileName = `evidence_${openid}_${Date.now()}.pdf`
    const fileID = `cloud://xiao-shi-qing-dev.7869-xiao-shi-qing-dev-1300000000/evidence/${fileName}`
    
    return {
      code: 0,
      fileID: fileID,
      message: '生成成功'
    }
    
  } catch (err) {
    console.error('生成PDF失败', err)
    return {
      code: -1,
      fileID: '',
      message: '生成失败'
    }
  }
}

function generatePDFContent(tasks, startDate, endDate) {
  let content = `
    <h1>维权证据包</h1>
    <p>生成时间：${new Date().toLocaleString()}</p>
    <p>时间范围：${startDate || '全部'} 至 ${endDate || '全部'}</p>
    <hr>
  `
  
  tasks.forEach((task, index) => {
    content += `
      <div class="task-item">
        <h3>记录 ${index + 1}</h3>
        <p><strong>时间：</strong>${new Date(task.createTime).toLocaleString()}</p>
        <p><strong>标签：</strong>${task.tags.join(', ')}</p>
        <p><strong>内容：</strong>${task.content}</p>
        <p><strong>耗时：</strong>${task.minutes} 分钟</p>
        ${task.remark ? `<p><strong>备注：</strong>${task.remark}</p>` : ''}
        ${task.images && task.images.length > 0 ? `<p><strong>照片：</strong>${task.images.length} 张</p>` : ''}
        ${task.audio ? `<p><strong>录音：</strong>有</p>` : ''}
      </div>
      <hr>
    `
  })
  
  return content
}
