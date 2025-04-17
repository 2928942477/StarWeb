// 粒子图片效果脚本
class ParticleImageEffect {
    constructor(options = {}) {
        // 创建画布
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particlesArray = [];
        this.imageParticles = [];
        this.targetParticles = [];
        this.animationState = 'dispersing'; // idle, forming, dispersing
        this.currentImage = null;
        this.imageData = null;
        this.autoTransition = false;
        this.transitionTimer = null;
        this.transitionDelay = 5000; // 图像保持时间，毫秒

        // 鼠标位置
        this.mouse = {
            x: null,
            y: null,
            radius: 100
        };

        // 默认配置
        this.options = {
            particleCount: 5000,
            particleBaseColor: 'rgba(255, 255, 255, 0.8)',
            particleRandomColor: true,
            particleSize: 2,
            particleMinSize: 1,
            particleMaxSize: 3,
            speed: 1.5,
            transitionSpeed: 0.02,
            responsive: true,
            containerSelector: '#canvas-container',
            autoTransition: true,       // 是否自动在图片和粒子之间切换
            transitionDelay: 5000,      // 切换延迟时间（毫秒）
            initialState: 'dispersed',  // 初始状态：'dispersed'或'image'
            ...options
        };
        
        // 应用选项
        this.autoTransition = this.options.autoTransition;
        this.transitionDelay = this.options.transitionDelay;

        // 设置画布样式
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '1';
        this.canvas.style.pointerEvents = 'none';

        // 添加到DOM
        const container = document.querySelector(this.options.containerSelector) || document.body;
        container.appendChild(this.canvas);

        // 初始化
        this.init();

        // 事件监听
        window.addEventListener('mousemove', (event) => {
            this.mouse.x = event.x;
            this.mouse.y = event.y;
        });

        window.addEventListener('mouseout', () => {
            this.mouse.x = null;
            this.mouse.y = null;
        });

        window.addEventListener('resize', () => {
            this.resize();
            if (this.currentImage) {
                this.formImage(this.currentImage);
            }
        });

        // 将实例暴露给全局
        window.particleEffect = this;
    }

    init() {
        // 设置画布大小
        this.resize();

        // 创建随机粒子
        this.createParticles();
        
        // 如果初始状态是分散的，则设置为分散状态
        if (this.options.initialState === 'dispersed') {
            this.disperseParticles(false); // 不触发动画状态变化
        }

        // 开始动画
        this.animate();
    }

    resize() {
        if (this.options.responsive) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    }

    // 创建随机粒子
    createParticles() {
        this.particlesArray = [];

        for (let i = 0; i < this.options.particleCount; i++) {
            const size = Math.random() * (this.options.particleMaxSize - this.options.particleMinSize) + this.options.particleMinSize;
            
            let color = this.options.particleBaseColor;
            if (this.options.particleRandomColor) {
                const hue = Math.floor(Math.random() * 360);
                const saturation = Math.floor(Math.random() * 50) + 50;
                const lightness = Math.floor(Math.random() * 20) + 50;
                color = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.8)`;
            }

            this.particlesArray.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: size,
                baseSize: size,
                color: color,
                speedX: (Math.random() - 0.5) * this.options.speed,
                speedY: (Math.random() - 0.5) * this.options.speed,
                targetX: 0,
                targetY: 0,
                inPosition: false
            });
        }
    }

    // 从图片创建粒子目标位置
    async formImage(imageSrc) {
        return new Promise((resolve) => {
            // 清除任何现有的转换计时器
            if (this.transitionTimer) {
                clearTimeout(this.transitionTimer);
                this.transitionTimer = null;
            }
            
            this.animationState = 'forming';
            this.currentImage = imageSrc;
            
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            
            img.onload = () => {
                // 创建临时画布来处理图像
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                
                // 计算图像的适当尺寸，保持纵横比
                const maxWidth = this.canvas.width * 0.7;
                const maxHeight = this.canvas.height * 0.7;
                
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                
                if (height > maxHeight) {
                    width = (maxHeight / height) * width;
                    height = maxHeight;
                }
                
                tempCanvas.width = width;
                tempCanvas.height = height;
                
                // 在临时画布上绘制调整大小后的图像
                tempCtx.drawImage(img, 0, 0, width, height);
                
                // 获取图像数据
                const imageData = tempCtx.getImageData(0, 0, width, height);
                this.imageData = imageData;
                
                // 计算图像在画布上的位置（居中）
                const offsetX = (this.canvas.width - width) / 2;
                const offsetY = (this.canvas.height - height) / 2;
                
                // 清空目标粒子数组
                this.targetParticles = [];
                
                // 采样图像像素并创建目标粒子
                const pixelInterval = Math.ceil(Math.sqrt((imageData.width * imageData.height) / this.options.particleCount));
                
                for (let y = 0; y < imageData.height; y += pixelInterval) {
                    for (let x = 0; x < imageData.width; x += pixelInterval) {
                        const i = (y * imageData.width + x) * 4;
                        const r = imageData.data[i];
                        const g = imageData.data[i + 1];
                        const b = imageData.data[i + 2];
                        const a = imageData.data[i + 3];
                        
                        // 只处理非透明像素
                        if (a > 128) {
                            this.targetParticles.push({
                                x: offsetX + x,
                                y: offsetY + y,
                                color: `rgba(${r}, ${g}, ${b}, ${a / 255})`
                            });
                        }
                    }
                }
                
                // 如果目标粒子数量超过可用粒子，则随机选择
                if (this.targetParticles.length > this.particlesArray.length) {
                    this.targetParticles = this.targetParticles
                        .sort(() => 0.5 - Math.random())
                        .slice(0, this.particlesArray.length);
                }
                
                // 为每个粒子分配目标位置
                for (let i = 0; i < Math.min(this.particlesArray.length, this.targetParticles.length); i++) {
                    this.particlesArray[i].targetX = this.targetParticles[i].x;
                    this.particlesArray[i].targetY = this.targetParticles[i].y;
                    this.particlesArray[i].color = this.targetParticles[i].color;
                    this.particlesArray[i].inPosition = false;
                }
                
                // 对于多余的粒子，将它们移到画布外
                for (let i = this.targetParticles.length; i < this.particlesArray.length; i++) {
                    this.particlesArray[i].targetX = -100;
                    this.particlesArray[i].targetY = -100;
                    this.particlesArray[i].inPosition = false;
                }
                
                resolve();
            };
            
            img.onerror = () => {
                console.error('图片加载失败:', imageSrc);
                this.animationState = 'idle';
                resolve();
            };
            
            img.src = imageSrc;
        });
    }

    // 分散粒子
    disperseParticles(changeState = true) {
        if (changeState) {
            this.animationState = 'dispersing';
        }
        
        // 清除任何现有的转换计时器
        if (this.transitionTimer) {
            clearTimeout(this.transitionTimer);
            this.transitionTimer = null;
        }
        
        for (let i = 0; i < this.particlesArray.length; i++) {
            this.particlesArray[i].targetX = Math.random() * this.canvas.width;
            this.particlesArray[i].targetY = Math.random() * this.canvas.height;
            this.particlesArray[i].inPosition = false;
            
            // 随机调整粒子大小
            this.particlesArray[i].size = Math.random() * (this.options.particleMaxSize - this.options.particleMinSize) + this.options.particleMinSize;
            
            if (this.options.particleRandomColor) {
                const hue = Math.floor(Math.random() * 360);
                const saturation = Math.floor(Math.random() * 50) + 50;
                const lightness = Math.floor(Math.random() * 20) + 50;
                this.particlesArray[i].color = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.8)`;
            } else {
                this.particlesArray[i].color = this.options.particleBaseColor;
            }
            
            // 随机调整速度
            this.particlesArray[i].speedX = (Math.random() - 0.5) * this.options.speed;
            this.particlesArray[i].speedY = (Math.random() - 0.5) * this.options.speed;
        }
    }

    // 绘制粒子
    drawParticles() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particlesArray.forEach(particle => {
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.closePath();
            this.ctx.fill();
        });
    }

    // 更新粒子位置
    updateParticles() {
        let allInPosition = true;
        
        this.particlesArray.forEach(particle => {
            if (this.animationState === 'forming') {
                // 向目标位置移动
                const dx = particle.targetX - particle.x;
                const dy = particle.targetY - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0.5) {
                    particle.x += dx * this.options.transitionSpeed;
                    particle.y += dy * this.options.transitionSpeed;
                    particle.inPosition = false;
                    allInPosition = false;
                } else {
                    particle.inPosition = true;
                }
                
                // 调整大小为基础大小
                if (particle.size < particle.baseSize) {
                    particle.size += 0.1;
                }
            } else if (this.animationState === 'dispersing') {
                // 向随机目标位置移动
                const dx = particle.targetX - particle.x;
                const dy = particle.targetY - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0.5) {
                    particle.x += dx * this.options.transitionSpeed;
                    particle.y += dy * this.options.transitionSpeed;
                    allInPosition = false;
                } else {
                    // 到达随机位置后开始自由移动
                    particle.x += particle.speedX;
                    particle.y += particle.speedY;
                    
                    // 边界检查
                    if (particle.x > this.canvas.width || particle.x < 0) {
                        particle.speedX = -particle.speedX;
                    }
                    if (particle.y > this.canvas.height || particle.y < 0) {
                        particle.speedY = -particle.speedY;
                    }
                }
                
                // 调整大小为基础大小
                if (particle.size > particle.baseSize) {
                    particle.size -= 0.1;
                }
            } else {
                // 自由移动
                particle.x += particle.speedX;
                particle.y += particle.speedY;
                
                // 边界检查
                if (particle.x > this.canvas.width || particle.x < 0) {
                    particle.speedX = -particle.speedX;
                }
                if (particle.y > this.canvas.height || particle.y < 0) {
                    particle.speedY = -particle.speedY;
                }
            }
            
            // 鼠标交互
            if (this.mouse.x != null && this.mouse.y != null) {
                const dx = particle.x - this.mouse.x;
                const dy = particle.y - this.mouse.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.mouse.radius) {
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const force = (this.mouse.radius - distance) / this.mouse.radius;
                    
                    particle.x += forceDirectionX * force * 2;
                    particle.y += forceDirectionY * force * 2;
                }
            }
        });
        
        // 如果所有粒子都到达目标位置，切换状态
        if (this.animationState === 'forming' && allInPosition) {
            // 如果启用了自动转换，设置计时器在一段时间后分散粒子
            if (this.autoTransition) {
                this.transitionTimer = setTimeout(() => {
                    this.disperseParticles();
                }, this.transitionDelay);
            }
        } else if (this.animationState === 'dispersing' && allInPosition) {
            this.animationState = 'idle';
            
            // 如果启用了自动转换，并且有当前图像，设置计时器在一段时间后重新形成图像
            if (this.autoTransition && this.currentImage) {
                this.transitionTimer = setTimeout(() => {
                    this.formImage(this.currentImage);
                }, this.transitionDelay / 2);
            }
        }
    }

    // 动画循环
    animate() {
        this.updateParticles();
        this.drawParticles();
        requestAnimationFrame(this.animate.bind(this));
    }
}

// 当DOM加载完成后初始化粒子效果
document.addEventListener('DOMContentLoaded', () => {
    // 创建粒子效果实例
    new ParticleImageEffect({
        particleCount: 6000,  // 粒子数量
        particleBaseColor: 'rgba(255, 255, 255, 0.8)',  // 基础粒子颜色
        particleRandomColor: true,  // 随机颜色
        particleSize: 2,  // 粒子大小
        particleMinSize: 1,  // 最小粒子大小
        particleMaxSize: 3,  // 最大粒子大小
        speed: 1.2,  // 移动速度
        transitionSpeed: 0.02,  // 过渡速度 - 较慢的过渡使动画更平滑
        containerSelector: '#canvas-container',  // 容器选择器
        autoTransition: true,  // 自动在图片和粒子之间切换
        transitionDelay: 8000,  // 图像保持时间（毫秒）
        initialState: 'dispersed'  // 初始状态为分散的粒子
    });
});