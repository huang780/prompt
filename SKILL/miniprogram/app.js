App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'xiao-shi-qing-dev',
        traceUser: true,
      })
    }
    
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync()
    this.globalData.systemInfo = systemInfo
    this.globalData.isDarkMode = systemInfo.theme === 'dark'
    
    // 监听主题变化
    wx.onThemeChange((res) => {
      this.globalData.isDarkMode = res.theme === 'dark'
    })
  },

  globalData: {
    systemInfo: null,
    isDarkMode: false,
    userInfo: null,
    openid: null
  }
})
