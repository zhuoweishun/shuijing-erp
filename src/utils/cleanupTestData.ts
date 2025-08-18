// 清理测试数据工具
// 用于彻底清除浏览器中可能残留的测试数据

export class TestDataCleanup {
  /**
   * 清理所有可能的测试数据
   */
  static cleanAll(): void {
    console.log('🧹 开始清理测试数据...');
    
    this.clearLocalStorage();
    this.clearSessionStorage();
    this.clearIndexedDB();
    this.clearCaches();
    
    console.log('✅ 测试数据清理完成！');
  }

  /**
   * 清理localStorage中的数据
   */
  private static clearLocalStorage(): void {
    const keysToRemove = [
      'purchases',
      'products',
      'lastSync',
      'dataBackup',
      'lastBackupTime',
      'appSettings',
      'ai_service_config',
      'theme'
    ];

    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`🗑️ 已清除localStorage: ${key}`);
      }
    });

    // 清理所有包含测试数据关键词的项
    const testKeywords = ['紫水晶', '黑闪灵', '张三', '测试', 'test'];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value && testKeywords.some(keyword => value.includes(keyword))) {
          localStorage.removeItem(key);
          console.log(`🗑️ 已清除包含测试数据的localStorage: ${key}`);
          i--; // 重新检查当前索引
        }
      }
    }
  }

  /**
   * 清理sessionStorage中的数据
   */
  private static clearSessionStorage(): void {
    const keysToRemove = [
      'tempData',
      'formData',
      'uploadProgress'
    ];

    keysToRemove.forEach(key => {
      if (sessionStorage.getItem(key)) {
        sessionStorage.removeItem(key);
        console.log(`🗑️ 已清除sessionStorage: ${key}`);
      }
    });

    // 清理所有包含测试数据关键词的项
    const testKeywords = ['紫水晶', '黑闪灵', '张三', '测试', 'test'];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        const value = sessionStorage.getItem(key);
        if (value && testKeywords.some(keyword => value.includes(keyword))) {
          sessionStorage.removeItem(key);
          console.log(`🗑️ 已清除包含测试数据的sessionStorage: ${key}`);
          i--; // 重新检查当前索引
        }
      }
    }
  }

  /**
   * 清理IndexedDB中的数据
   */
  private static clearIndexedDB(): void {
    if ('indexedDB' in window) {
      const dbNames = ['shuijing_erp', 'erp_cache', 'app_data'];
      
      dbNames.forEach(dbName => {
        try {
          const deleteRequest = indexedDB.deleteDatabase(dbName);
          deleteRequest.onsuccess = () => {
            console.log(`🗑️ 已清除IndexedDB: ${dbName}`);
          };
          deleteRequest.onerror = () => {
            console.log(`⚠️ IndexedDB ${dbName} 不存在或已清除`);
          };
        } catch (error) {
          console.warn(`⚠️ 清除IndexedDB ${dbName} 时出错:`, error);
        }
      });
    }
  }

  /**
   * 清理浏览器缓存（如果可能）
   */
  private static clearCaches(): void {
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName).then(() => {
            console.log(`🗑️ 已清除缓存: ${cacheName}`);
          });
        });
      }).catch(error => {
        console.warn('⚠️ 清除缓存时出错:', error);
      });
    }
  }

  /**
   * 检查是否还有残留的测试数据
   */
  static checkForTestData(): boolean {
    const testKeywords = ['紫水晶', '黑闪灵', '张三', '水晶批发商'];
    let hasTestData = false;

    // 检查localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value && testKeywords.some(keyword => value.includes(keyword))) {
          console.warn(`⚠️ 发现残留测试数据 localStorage[${key}]:`, value);
          hasTestData = true;
        }
      }
    }

    // 检查sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        const value = sessionStorage.getItem(key);
        if (value && testKeywords.some(keyword => value.includes(keyword))) {
          console.warn(`⚠️ 发现残留测试数据 sessionStorage[${key}]:`, value);
          hasTestData = true;
        }
      }
    }

    if (!hasTestData) {
      console.log('✅ 未发现残留的测试数据');
    }

    return hasTestData;
  }
}

// 导出便捷方法
export const cleanupTestData = () => TestDataCleanup.cleanAll();
export const checkTestData = () => TestDataCleanup.checkForTestData();