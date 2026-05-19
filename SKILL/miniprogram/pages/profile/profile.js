const util = require('../../utils/util.js')
const db = require('../../utils/db.js')

Page({
  data: {
    userStats: {
      total: 0,
      pending: 0,
      completed: 0
    },
    settings: null,
    reminderTime: '18:00',
    customTags: [],
    newTagName: '',
    showTagModal: false,
    showTimePicker: false,
    hasSubscribed: false
  },

  async onLoad() {
    await this.loadUserStats()
    await this.loadSettings()
    this.checkSubscription()
  },

  async onShow() {
    await this.loadUserStats()
    await this.loadSettings()
  },

  async loadUserStats() {
    try {
      const stats = await db.getUserStats()
      this.setData({ userStats: stats })
    } catch (err) {
      console.error('加载统计失败', err)
    }
  },

  async loadSettings() {
    try {
      const settings = await db.getSettings()
      this.setData({
        settings,
        reminderTime: settings.reminderTime || '18:00',
        customTags: settings.customTags || []
      })
    } catch (err) {
      console.error('加载设置失败', err)
    }
  },

  checkSubscription() {
    // 检查是否已订阅
    const subscribed = wx.getStorageSync('hasSubscribed')
    this.setData({ hasSubscribed: subscribed })
  },

  // 订阅服务通知
  async subscribeNotification() {
    try {
      const res = await wx.requestSubscribeMessage({
        tmplIds: ['YOUR_TEMPLATE_ID'] // 需要替换为实际的模板ID
      })
      
      if (res['YOUR_TEMPLATE_ID'] === 'accept') {
        wx.setStorageSync('hasSubscribed', true)
        this.setData({ hasSubscribed: true })
        util.showToast('订阅成功', 'success')
      } else {
        util.showToast('订阅失败')
      }
    } catch (err) {
      console.error('订阅失败', err)
      util.showToast('订阅失败')
    }
  },

  // 显示时间选择器
  showTimePicker() {
    this.setData({ showTimePicker: true })
  },

  // 关闭时间选择器
  closeTimePicker() {
    this.setData({ showTimePicker: false })
  },

  // 选择时间
  onTimeChange(e) {
    this.setData({ reminderTime: e.detail.value })
  },

  // 保存提醒时间
  async saveReminderTime() {
    try {
      await db.updateSettings(this.data.settings._id, {
        reminderTime: this.data.reminderTime
      })
      
      this.setData({ showTimePicker: false })
      util.showToast('保存成功', 'success')
      
      // 更新定时触发器
      await wx.cloud.callFunction({
        name: 'updateReminder',
        data: {
          reminderTime: this.data.reminderTime
        }
      })
      
    } catch (err) {
      console.error('保存失败', err)
      util.showToast('保存失败')
    }
  },

  // 显示标签管理弹窗
  showTagModal() {
    this.setData({ showTagModal: true })
  },

  // 关闭标签管理弹窗
  closeTagModal() {
    this.setData({ showTagModal: false, newTagName: '' })
  },

  // 输入新标签
  onTagInput(e) {
    this.setData({ newTagName: e.detail.value })
  },

  // 添加自定义标签
  async addCustomTag() {
    const { newTagName, customTags } = this.data
    
    if (!newTagName.trim()) {
      util.showToast('请输入标签名称')
      return
    }
    
    if (newTagName.length < 4 || newTagName.length > 8) {
      util.showToast('标签长度需在4-8字之间')
      return
    }
    
    if (customTags.length >= 5) {
      util.showToast('最多添加5个自定义标签')
      return
    }
    
    const tagName = '#' + newTagName.trim()
    
    // 检查是否已存在
    if (customTags.some(t => t.name === tagName)) {
      util.showToast('标签已存在')
      return
    }
    
    try {
      const newTag = {
        id: 'custom_' + Date.now(),
        name: tagName,
        icon: '🏷️'
      }
      
      const updatedTags = [...customTags, newTag]
      
      await db.updateSettings(this.data.settings._id, {
        customTags: updatedTags
      })
      
      this.setData({
        customTags: updatedTags,
        newTagName: ''
      })
      
      util.showToast('添加成功', 'success')
      
    } catch (err) {
      console.error('添加失败', err)
      util.showToast('添加失败')
    }
  },

  // 删除自定义标签
  async deleteCustomTag(e) {
    const { id } = e.currentTarget.dataset
    
    const confirmed = await util.showModal('确认删除', '删除后该标签将变为#其他')
    if (!confirmed) return
    
    try {
      const updatedTags = this.data.customTags.filter(t => t.id !== id)
      
      await db.updateSettings(this.data.settings._id, {
        customTags: updatedTags
      })
      
      this.setData({ customTags: updatedTags })
      util.showToast('删除成功', 'success')
      
    } catch (err) {
      console.error('删除失败', err)
      util.showToast('删除失败')
    }
  },

  // 清理缓存
  clearCache() {
    wx.showModal({
      title: '清理缓存',
      content: '确定要清理本地缓存吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorage({
            success: () => {
              util.showToast('清理成功', 'success')
            },
            fail: () => {
              util.showToast('清理失败')
            }
          })
        }
      }
    })
  },

  // 关于我们
  showAbout() {
    wx.showModal({
      title: '关于小事清',
      content: '小事清 v1.0\n\n记录工作中的琐事，保护自己的时间。',
      showCancel: false
    })
  },

  // 反馈建议
  feedback() {
    wx.showModal({
      title: '反馈建议',
      content: '感谢您的反馈！请发送邮件至 feedback@xiaoshiqing.com',
      showCancel: false
    })
  },

  preventClose() {}
})
