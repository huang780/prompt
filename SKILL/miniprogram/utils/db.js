const db = wx.cloud.database()
const _ = db.command

const COLLECTIONS = {
  TASKS: 'tasks',
  USERS: 'users',
  TAGS: 'tags',
  SETTINGS: 'settings'
}

class Database {
  constructor() {
    this.db = db
    this._ = _
  }

  // 获取用户openid
  async getOpenId() {
    const { result } = await wx.cloud.callFunction({
      name: 'getOpenId'
    })
    return result.openid
  }

  // 添加小事
  async addTask(taskData) {
    const openid = await this.getOpenId()
    return await db.collection(COLLECTIONS.TASKS).add({
      data: {
        ...taskData,
        openid,
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
        isDeleted: false
      }
    })
  }

  // 获取小事列表
  async getTasks(options = {}) {
    const { 
      status, 
      tags, 
      startDate, 
      endDate, 
      hasEvidence,
      page = 1, 
      pageSize = 20 
    } = options
    
    const openid = await this.getOpenId()
    let query = db.collection(COLLECTIONS.TASKS)
      .where({
        openid,
        isDeleted: false
      })

    if (status !== undefined && status !== null) {
      query = query.where({ status })
    }

    if (tags && tags.length > 0) {
      query = query.where({
        tags: _.in(tags)
      })
    }

    if (startDate && endDate) {
      query = query.where({
        createTime: _.gte(new Date(startDate)).and(_.lte(new Date(endDate)))
      })
    }

    if (hasEvidence) {
      query = query.where({
        $or: [
          { images: _.neq([]) },
          { audio: _.neq(null) }
        ]
      })
    }

    const res = await query
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return res.data
  }

  // 获取小事详情
  async getTaskById(taskId) {
    const res = await db.collection(COLLECTIONS.TASKS).doc(taskId).get()
    return res.data
  }

  // 更新小事
  async updateTask(taskId, updateData) {
    return await db.collection(COLLECTIONS.TASKS).doc(taskId).update({
      data: {
        ...updateData,
        updateTime: db.serverDate()
      }
    })
  }

  // 软删除小事
  async deleteTask(taskId) {
    return await db.collection(COLLECTIONS.TASKS).doc(taskId).update({
      data: {
        isDeleted: true,
        deleteTime: db.serverDate()
      }
    })
  }

  // 批量删除
  async batchDelete(taskIds) {
    const tasks = taskIds.map(id => {
      return db.collection(COLLECTIONS.TASKS).doc(id).update({
        data: {
          isDeleted: true,
          deleteTime: db.serverDate()
        }
      })
    })
    return await Promise.all(tasks)
  }

  // 批量标记完成
  async batchComplete(taskIds) {
    const tasks = taskIds.map(id => {
      return db.collection(COLLECTIONS.TASKS).doc(id).update({
        data: {
          status: 1,
          updateTime: db.serverDate()
        }
      })
    })
    return await Promise.all(tasks)
  }

  // 获取统计数据
  async getStatistics(startDate, endDate) {
    const openid = await this.getOpenId()
    const res = await db.collection(COLLECTIONS.TASKS)
      .where({
        openid,
        isDeleted: false,
        createTime: _.gte(new Date(startDate)).and(_.lte(new Date(endDate)))
      })
      .get()
    
    return res.data
  }

  // 获取或创建设置
  async getSettings() {
    const openid = await this.getOpenId()
    const res = await db.collection(COLLECTIONS.SETTINGS)
      .where({ openid })
      .get()
    
    if (res.data.length > 0) {
      return res.data[0]
    } else {
      // 创建默认设置
      const defaultSettings = {
        openid,
        reminderTime: '18:00',
        customTags: [],
        createTime: db.serverDate()
      }
      const addRes = await db.collection(COLLECTIONS.SETTINGS).add({
        data: defaultSettings
      })
      return { ...defaultSettings, _id: addRes._id }
    }
  }

  // 更新设置
  async updateSettings(settingsId, updateData) {
    return await db.collection(COLLECTIONS.SETTINGS).doc(settingsId).update({
      data: {
        ...updateData,
        updateTime: db.serverDate()
      }
    })
  }

  // 获取用户统计
  async getUserStats() {
    const openid = await this.getOpenId()
    
    const totalRes = await db.collection(COLLECTIONS.TASKS)
      .where({ openid, isDeleted: false })
      .count()
    
    const pendingRes = await db.collection(COLLECTIONS.TASKS)
      .where({ openid, isDeleted: false, status: 0 })
      .count()
    
    const completedRes = await db.collection(COLLECTIONS.TASKS)
      .where({ openid, isDeleted: false, status: 1 })
      .count()
    
    return {
      total: totalRes.total,
      pending: pendingRes.total,
      completed: completedRes.total
    }
  }
}

module.exports = new Database()
