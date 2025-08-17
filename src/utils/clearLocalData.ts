// 清除本地存储数据工具

export class LocalDataCleaner {
  /**
   * 清除所有本地存储的数据
   */
  static clearAllLocalData(): void {
    console.log('🗑️ 开始清除所有本地存储数据...');
    
    try {
      // 清除localStorage中的所有相关数据
      const localStorageKeys = [
        'purchases',
        'products',
        'user_profiles',
        'cached_purchases',
        'offline_purchases',
        'local_purchases',
        'backup_purchases',
        'temp_purchases',
        'draft_purchases'
      ];
      
      localStorageKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`✅ 已清除localStorage: ${key}`);
        }
      });
      
      // 清除sessionStorage中的所有相关数据
      const sessionStorageKeys = [
        'purchases',
        'products',
        'user_profiles',
        'cached_purchases',
        'temp_data',
        'session_purchases'
      ];
      
      sessionStorageKeys.forEach(key => {
        if (sessionStorage.getItem(key)) {
          sessionStorage.removeItem(key);
          console.log(`✅ 已清除sessionStorage: ${key}`);
        }
      });
      
      // 清除IndexedDB（如果有的话）
      this.clearIndexedDB();
      
      console.log('🎉 所有本地存储数据已清除完毕');
      
    } catch (error) {
      console.error('❌ 清除本地存储数据时出错:', error);
    }
  }
  
  /**
   * 清除IndexedDB数据
   */
  private static clearIndexedDB(): void {
    try {
      if ('indexedDB' in window) {
        // 尝试删除可能存在的IndexedDB数据库
        const dbNames = ['purchases_db', 'erp_db', 'local_db', 'backup_db'];
        
        dbNames.forEach(dbName => {
          const deleteRequest = indexedDB.deleteDatabase(dbName);
          deleteRequest.onsuccess = () => {
            console.log(`✅ 已清除IndexedDB: ${dbName}`);
          };
          deleteRequest.onerror = () => {
            console.log(`⚠️ IndexedDB ${dbName} 不存在或已清除`);
          };
        });
      }
    } catch (error) {
      console.warn('⚠️ 清除IndexedDB时出错:', error);
    }
  }
  
  /**
   * 检查是否还有本地数据残留
   */
  static checkLocalDataRemaining(): boolean {
    const keysToCheck = [
      'purchases',
      'products',
      'user_profiles',
      'cached_purchases',
      'offline_purchases',
      'local_purchases'
    ];
    
    let hasLocalData = false;
    
    keysToCheck.forEach(key => {
      if (localStorage.getItem(key) || sessionStorage.getItem(key)) {
        console.warn(`⚠️ 发现残留的本地数据: ${key}`);
        hasLocalData = true;
      }
    });
    
    if (!hasLocalData) {
      console.log('✅ 确认：没有本地数据残留');
    }
    
    return hasLocalData;
  }
  
  /**
   * 强制刷新页面并清除缓存
   */
  static forceRefreshAndClearCache(): void {
    console.log('🔄 强制刷新页面并清除缓存...');
    
    // 清除所有本地数据
    this.clearAllLocalData();
    
    // 强制刷新页面，清除内存中的缓存
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
}

// 立即执行清除操作
LocalDataCleaner.clearAllLocalData();

// 导出供其他模块使用
export default LocalDataCleaner;