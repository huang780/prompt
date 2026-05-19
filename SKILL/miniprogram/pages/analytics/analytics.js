const util = require('../../utils/util.js')
const db = require('../../utils/db.js')

const PREDEFINED_TAGS = [
  { id: 'jiahuo', name: '#加活', icon: '💼' },
  { id: 'shuaiguo', name: '#甩锅', icon: '🥘' },
  { id: 'jiaban', name: '#加班', icon: '🌙' },
  { id: 'wuli', name: '#顾客无理', icon: '😤' },
  { id: 'daigang', name: '#代岗', icon: '🔄' }
]

Page({
  data: {
    loading: true,
    dateRange: 'week',
    startDate: '',
    endDate: '',
    
    totalMinutes: 0,
    taskCount: 0,
    tagStats: [],
    pieData: [],
    rankList: [],
    
    evidenceTasks: [],
    showEvidenceModal: false,
    selectedEvidence: []
  },

  onLoad() {
    this.setDefaultDateRange()
    this.loadStatistics()
  },

  onShow() {
    this.loadStatistics()
  },

  setDefaultDateRange() {
    const now = new Date()
    const dayOfWeek = now.getDay() || 7
    const startOfWeek = new Date(now.getTime() - (dayOfWeek - 1) * 24 * 60 * 60 * 1000)
    const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000)
    
    this.setData({
      startDate: util.formatDate(startOfWeek, 'YYYY-MM-DD'),
      endDate: util.formatDate(endOfWeek, 'YYYY-MM-DD')
    })
  },

  changeDateRange(e) {
    const { range } = e.currentTarget.dataset
    const now = new Date()
    let startDate, endDate
    
    switch(range) {
      case 'week':
        const dayOfWeek = now.getDay() || 7
        const startOfWeek = new Date(now.getTime() - (dayOfWeek - 1) * 24 * 60 * 60 * 1000)
        const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000)
        startDate = util.formatDate(startOfWeek, 'YYYY-MM-DD')
        endDate = util.formatDate(endOfWeek, 'YYYY-MM-DD')
        break
      case 'lastWeek':
        const lastWeekDay = now.getDay() || 7
        const startOfLastWeek = new Date(now.getTime() - (lastWeekDay - 1 + 7) * 24 * 60 * 60 * 1000)
        const endOfLastWeek = new Date(startOfLastWeek.getTime() + 6 * 24 * 60 * 60 * 1000)
        startDate = util.formatDate(startOfLastWeek, 'YYYY-MM-DD')
        endDate = util.formatDate(endOfLastWeek, 'YYYY-MM-DD')
        break
      case 'month':
        startDate = util.formatDate(new Date(now.getFullYear(), now.getMonth(), 1), 'YYYY-MM-DD')
        endDate = util.formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'YYYY-MM-DD')
        break
      case 'lastMonth':
        startDate = util.formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1), 'YYYY-MM-DD')
        endDate = util.formatDate(new Date(now.getFullYear(), now.getMonth(), 0), 'YYYY-MM-DD')
        break
    }
    
    this.setData({
      dateRange: range,
      startDate,
      endDate
    })
    
    this.loadStatistics()
  },

  async loadStatistics() {
    this.setData({ loading: true })
    
    try {
      const tasks = await db.getStatistics(this.data.startDate, this.data.endDate)
      
      const totalMinutes = tasks.reduce((sum, task) => sum + task.minutes, 0)
      
      const tagMap = {}
      tasks.forEach(task => {
        task.tags.forEach(tag => {
          if (!tagMap[tag]) {
            tagMap[tag] = { name: tag, minutes: 0, count: 0 }
          }
          tagMap[tag].minutes += task.minutes
          tagMap[tag].count += 1
        })
      })
      
      const tagStats = Object.values(tagMap).sort((a, b) => b.minutes - a.minutes)
      
      const pieData = this.calculatePieData(tagStats, totalMinutes)
      
      const rankList = tagStats.slice(0, 5).map((item, index) => {
        const tagObj = PREDEFINED_TAGS.find(t => t.name === item.name)
        return {
          ...item,
          rank: index + 1,
          icon: tagObj ? tagObj.icon : '📝',
          percentage: totalMinutes > 0 ? ((item.minutes / totalMinutes) * 100).toFixed(1) : 0
        }
      })
      
      const evidenceTags = ['#加活', '#甩锅', '#加班', '#顾客无理']
      const evidenceTasks = tasks.filter(task => 
        task.tags.some(tag => evidenceTags.includes(tag))
      )
      
      this.setData({
        totalMinutes,
        taskCount: tasks.length,
        tagStats,
        pieData,
        rankList,
        evidenceTasks,
        loading: false
      })
      
    } catch (err) {
      console.error('加载统计失败', err)
      this.setData({ loading: false })
      util.showToast('加载失败')
    }
  },

  calculatePieData(tagStats, totalMinutes) {
    if (totalMinutes === 0) return []
    
    const data = tagStats.map(item => ({
      name: item.name,
      value: item.minutes,
      percentage: ((item.minutes / totalMinutes) * 100).toFixed(1)
    }))
    
    const mainData = data.filter(item => parseFloat(item.percentage) >= 2)
    const otherData = data.filter(item => parseFloat(item.percentage) < 2)
    
    if (otherData.length > 0) {
      const otherMinutes = otherData.reduce((sum, item) => sum + item.value, 0)
      const otherPercentage = ((otherMinutes / totalMinutes) * 100).toFixed(1)
      mainData.push({
        name: '其他',
        value: otherMinutes,
        percentage: otherPercentage
      })
    }
    
    return mainData
  },

  onRankItemTap(e) {
    const { tag } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/list/list?tag=${tag}`
    })
  },

  showEvidenceModal() {
    if (this.data.evidenceTasks.length === 0) {
      util.showToast('当前范围内无维权相关记录')
      return
    }
    
    this.setData({
      showEvidenceModal: true,
      selectedEvidence: this.data.evidenceTasks.map(t => t._id)
    })
  },

  closeEvidenceModal() {
    this.setData({ showEvidenceModal: false })
  },

  toggleEvidenceSelect(e) {
    const { id } = e.currentTarget.dataset
    const { selectedEvidence } = this.data
    const index = selectedEvidence.indexOf(id)
    
    if (index > -1) {
      selectedEvidence.splice(index, 1)
    } else {
      selectedEvidence.push(id)
    }
    
    this.setData({ selectedEvidence })
  },

  async generateEvidencePackage() {
    if (this.data.selectedEvidence.length === 0) {
      util.showToast('请至少选择一条记录')
      return
    }
    
    wx.showLoading({ title: '生成中...' })
    
    try {
      const selectedTasks = this.data.evidenceTasks.filter(
        task => this.data.selectedEvidence.includes(task._id)
      )
      
      // 生成PDF或长图
      const { result } = await wx.cloud.callFunction({
        name: 'generateEvidencePDF',
        data: {
          tasks: selectedTasks,
          startDate: this.data.startDate,
          endDate: this.data.endDate
        }
      })
      
      wx.hideLoading()
      
      if (result.code === 0) {
        // 下载PDF
        const downloadRes = await wx.cloud.downloadFile({
          fileID: result.fileID
        })
        
        // 保存到本地
        await wx.saveFile({
          tempFilePath: downloadRes.tempFilePath
        })
        
        util.showToast('证据包已生成', 'success')
        this.closeEvidenceModal()
      } else {
        util.showToast('生成失败')
      }
      
    } catch (err) {
      wx.hideLoading()
      console.error('生成失败', err)
      util.showToast('生成失败')
    }
  },

  onShareAppMessage() {
    return {
      title: `我的时间小偷周报 - 被偷走 ${this.data.totalMinutes} 分钟`,
      path: '/pages/analytics/analytics'
    }
  },

  preventClose() {}
})
