class StoreUtil {
  // 设置数据
  public static set(key: string, value: any): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // 获取数据
  public static get<T>(key: string, defaultValue?: T): T | null {
    const item = localStorage.getItem(key);
    if (item) {
      try {
        return JSON.parse(item) as T;
      } catch (error) {
        console.error(`Error parsing localStorage key "${key}":`, error);
        return defaultValue ?? null;
      }
    }
    return defaultValue ?? null;
  }

  // 删除数据
  public static delete(key: string): void {
    localStorage.removeItem(key);
  }

  // 清空所有数据
  public static clear(): void {
    localStorage.clear();
  }
}

// 导出类
export default StoreUtil;
