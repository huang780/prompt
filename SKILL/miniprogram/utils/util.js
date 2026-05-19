const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

const formatDate = (date, format = 'YYYY-MM-DD') => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  
  return format
    .replace('YYYY', year)
    .replace('MM', formatNumber(month))
    .replace('DD', formatNumber(day))
}

const getRelativeDate = (date) => {
  const now = new Date()
  const target = new Date(date)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  
  if (target >= today) {
    return '今天'
  } else if (target >= yesterday) {
    return '昨天'
  } else {
    return formatDate(target, 'MM-DD')
  }
}

const debounce = (fn, delay = 300) => {
  let timer = null
  return function(...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

const throttle = (fn, interval = 300) => {
  let lastTime = 0
  return function(...args) {
    const now = Date.now()
    if (now - lastTime >= interval) {
      lastTime = now
      fn.apply(this, args)
    }
  }
}

const showToast = (title, icon = 'none') => {
  wx.showToast({
    title,
    icon,
    duration: 2000
  })
}

const showModal = (title, content) => {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => {
        resolve(res.confirm)
      }
    })
  })
}

const cloudCall = async (name, data = {}) => {
  try {
    const res = await wx.cloud.callFunction({
      name,
      data
    })
    return res.result
  } catch (err) {
    console.error('云函数调用失败:', err)
    throw err
  }
}

const uploadFile = async (filePath, cloudPath) => {
  try {
    const res = await wx.cloud.uploadFile({
      cloudPath,
      filePath
    })
    return res.fileID
  } catch (err) {
    console.error('文件上传失败:', err)
    throw err
  }
}

const PREDEFINED_TAGS = [
  { id: 'jiahuo', name: '#加活', icon: '💼' },
  { id: 'shuaiguo', name: '#甩锅', icon: '🥘' },
  { id: 'jiaban', name: '#加班', icon: '🌙' },
  { id: 'wuli', name: '#顾客无理', icon: '😤' },
  { id: 'daigang', name: '#代岗', icon: '🔄' }
]

module.exports = {
  formatTime,
  formatDate,
  getRelativeDate,
  debounce,
  throttle,
  showToast,
  showModal,
  cloudCall,
  uploadFile,
  PREDEFINED_TAGS
}
