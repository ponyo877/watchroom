package service

import (
	"sync"
	"time"
)

// CacheEntry はキャッシュエントリを表す
type CacheEntry struct {
	Data      interface{}
	ExpiresAt time.Time
}

// MemoryCache はスレッドセーフなインメモリキャッシュ
type MemoryCache struct {
	mu    sync.RWMutex
	items map[string]CacheEntry
}

// NewMemoryCache は新しいMemoryCacheを作成する
func NewMemoryCache() *MemoryCache {
	cache := &MemoryCache{
		items: make(map[string]CacheEntry),
	}
	// バックグラウンドで期限切れエントリを定期的にクリーンアップ
	go cache.cleanupLoop()
	return cache
}

// Get はキャッシュからエントリを取得する
func (c *MemoryCache) Get(key string) (interface{}, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	entry, ok := c.items[key]
	if !ok {
		return nil, false
	}

	if time.Now().After(entry.ExpiresAt) {
		return nil, false
	}

	return entry.Data, true
}

// Set はキャッシュにエントリを保存する
func (c *MemoryCache) Set(key string, value interface{}, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.items[key] = CacheEntry{
		Data:      value,
		ExpiresAt: time.Now().Add(ttl),
	}
}

// Delete はキャッシュからエントリを削除する
func (c *MemoryCache) Delete(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.items, key)
}

// Clear はキャッシュをクリアする
func (c *MemoryCache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items = make(map[string]CacheEntry)
}

// cleanupLoop は期限切れエントリを定期的に削除する
func (c *MemoryCache) cleanupLoop() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.cleanup()
	}
}

// cleanup は期限切れエントリを削除する
func (c *MemoryCache) cleanup() {
	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now()
	for key, entry := range c.items {
		if now.After(entry.ExpiresAt) {
			delete(c.items, key)
		}
	}
}

// Size はキャッシュのサイズを返す
func (c *MemoryCache) Size() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.items)
}
