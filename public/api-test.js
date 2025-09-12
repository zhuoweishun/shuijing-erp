// API连接测试脚本
// 在浏览器控制台中运行: loadScript('/api-test.js')

(function() {
    'use strict';
    
    console.log('🔧 API连接测试脚本已加载');
    
    // 全局测试函数
    window.api_test = {
        // 测试API连接
        async testConnection() {
            console.log('🚀 开始API连接测试...');
            
            const testUrls = [
                'http://localhost:3001/api/v1/health',
                'http://127.0.0.1:3001/api/v1/health'
            ];
            
            // 添加缓存的IP测试
            const cachedIP = localStorage.getItem('cached_local_ip');
            if (cachedIP) {
                testUrls.push(`http://${cachedIP}:3001/api/v1/health`);
            }
            
            // 添加当前主机名测试
            const hostname = window.location.hostname;
            if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
                testUrls.push(`http://${hostname}:3001/api/v1/health`);
            }
            
            const results = [];
            
            for (const url of testUrls) {
                console.log(`测试连接: ${url}`);
                
                try {
                    const startTime = Date.now();
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    const endTime = Date.now();
                    
                    const result = {
                        url,
                        success: response.ok,
                        status: response.status,
                        statusText: response.statusText,
                        responseTime: endTime - startTime
                    };
                    
                    if (response.ok) {
                        console.log(`✅ ${url} - 成功 (${result.responseTime}ms)`);
                        try {
                            result.data = await response.json();
                        } catch (e) {
                            result.data = await response.text();
                        }
                    } else {
                        console.log(`❌ ${url} - 失败: ${response.status}`);
                    }
                    
                    results.push(result);
                } catch (error) {
                    console.log(`❌ ${url} - 网络错误: ${error.message}`);
                    results.push({
                        url,
                        success: false,
                        error: error.message
                    });
                }
            }
            
            console.log('📊 测试结果汇总:', results);
            return results;
        },
        
        // 检测IP地址
        async detectIP() {
            console.log('🌐 开始IP地址检测...');
            
            return new Promise((resolve) => {
                try {
                    const pc = new RTCPeerConnection({ iceServers: [] });
                    pc.createDataChannel('');
                    
                    const ips = [];
                    let resolved = false;
                    
                    pc.onicecandidate = (event) => {
                        if (resolved) return;
                        
                        if (event.candidate) {
                            const candidate = event.candidate.candidate;
                            const ipMatch = candidate.match(/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/);
                            if (ipMatch && ipMatch[1]) {
                                const ip = ipMatch[1];
                                if (!ips.includes(ip)) {
                                    ips.push(ip);
                                    console.log(`发现IP: ${ip}`);
                                }
                                
                                // 如果是局域网IP，缓存它
                                if (ip.startsWith('192.168.') || ip.startsWith('10.') || 
                                    (ip.startsWith('172.') && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31)) {
                                    localStorage.setItem('cached_local_ip', ip);
                                    console.log(`✅ 缓存局域网IP: ${ip}`);
                                }
                            }
                        }
                    };
                    
                    pc.createOffer().then(offer => pc.setLocalDescription(offer)).catch(() => {
                        if (!resolved) {
                            resolved = true;
                            pc.close();
                            console.log('🔍 IP检测完成:', ips);
                            resolve(ips);
                        }
                    });
                    
                    // 使用更安全的超时处理
                    if (typeof window !== 'undefined' && window.setTimeout) {
                        window.setTimeout(() => {
                            if (!resolved) {
                                resolved = true;
                                pc.close();
                                console.log('🔍 IP检测完成:', ips);
                                resolve(ips);
                            }
                        }, 3000);
                    } else {
                        // 如果setTimeout不可用，使用Promise.race作为备选
                        Promise.race([
                            new Promise(resolve => {
                                let start = Date.now();
                                function check() {
                                    if (Date.now() - start > 3000) {
                                        resolve(null);
                                    } else {
                                        requestAnimationFrame(check);
                                    }
                                }
                                check();
                            })
                        ]).then(() => {
                            if (!resolved) {
                                resolved = true;
                                pc.close();
                                console.log('🔍 IP检测完成:', ips);
                                resolve(ips);
                            }
                        });
                    }
                } catch (error) {
                    console.error('IP检测错误:', error);
                    resolve([]);
                }
            });
        },
        
        // 清除缓存
        clearCache() {
            console.log('🧹 清除API相关缓存...');
            localStorage.removeItem('cached_local_ip');
            console.log('✅ 缓存已清除');
        },
        
        // 获取当前API配置
        getApiConfig() {
            const config = {
                hostname: window.location.hostname,
                port: window.location.port,
                protocol: window.location.protocol,
                cachedIP: localStorage.getItem('cached_local_ip'),
                userAgent: navigator.userAgent,
                timestamp: new Date().to_i_s_o_string()
            };
            
            console.log('⚙️ 当前API配置:', config);
            return config;
        },
        
        // 测试财务API
        async testFinancialAPI() {
            console.log('💰 测试财务API...');
            
            const token = localStorage.getItem('auth_token');
            if (!token) {
                console.log('❌ 未找到认证token，请先登录');
                return;
            }
            
            const apiUrl = this.get_api_url();
            const endpoint = `${apiUrl}/financial/overview/summary`;
            
            console.log(`测试端点: ${endpoint}`);
            
            try {
                const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ 财务API测试成功:', data);
                    return data;
                } else {
                    console.log(`❌ 财务API测试失败: ${response.status} ${response.statusText}`);
                    const errorText = await response.text();
                    console.log('错误详情:', errorText);
                }
            } catch (error) {
                console.log(`❌ 财务API网络错误: ${error.message}`);
            }
        },
        
        // 获取API URL（模拟前端逻辑）
        getApiUrl() {
            const hostname = window.location.hostname;
            const cachedIP = localStorage.getItem('cached_local_ip');
            
            console.log(`主机名: ${hostname}, 缓存IP: ${cachedIP}`);
            
            if (hostname.includes('dorblecapital.com')) {
                return 'https://api.dorblecapital.com/api/v1';
            }
            
            if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || 
                (hostname.startsWith('172.') && parseInt(hostname.split('.')[1]) >= 16 && parseInt(hostname.split('.')[1]) <= 31)) {
                return `http://${hostname}:3001/api/v1`;
            }
            
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                if (cachedIP && cachedIP !== 'localhost' && cachedIP !== '127.0.0.1' && 
                    (cachedIP.startsWith('192.168.') || cachedIP.startsWith('10.') || 
                     (cachedIP.startsWith('172.') && parseInt(cachedIP.split('.')[1]) >= 16 && parseInt(cachedIP.split('.')[1]) <= 31))) {
                    console.log(`使用缓存的局域网IP: ${cachedIP}`);
                    return `http://${cachedIP}:3001/api/v1`;
                }
                return `http://localhost:3001/api/v1`;
            }
            
            return `http://${hostname}:3001/api/v1`;
        },
        
        // 完整诊断
        async fullDiagnosis() {
            console.log('🔍 开始完整诊断...');
            
            console.log('\n1. 获取API配置');
            this.get_api_config();
            
            console.log('\n2. 检测IP地址');
            await this.detect_i_p();
            
            console.log('\n3. 测试API连接');
            await this.test_connection();
            
            console.log('\n4. 测试财务API');
            await this.test_financial_a_p_i();
            
            console.log('\n✅ 诊断完成');
        }
    };
    
    // 快捷命令
    window.test_a_p_i = window.api_test.test_connection;
    window.detect_i_p = window.api_test.detect_i_p;
    window.clear_a_p_i_cache = window.api_test.clear_cache;
    window.diagnose_a_p_i = window.api_test.full_diagnosis;
    
    console.log('📋 可用命令:');
    console.log('  testAPI() - 测试API连接');
    console.log('  detectIP() - 检测IP地址');
    console.log('  clearAPICache() - 清除缓存');
    console.log('  diagnoseAPI() - 完整诊断');
    console.log('  apiTest.test_financial_a_p_i() - 测试财务API');
    
})();