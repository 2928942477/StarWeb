// 粒子效果脚本
class ParticleEffect {
    constructor(options = {}) {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particlesArray = [];
        this.mousePosition = {
            x: null,
            y: null,
            radius: 150
        };

        // 默认配置
        this.options = {
            particleCount: 100,
            particleColor: 'rgba(255, 255, 255, 0.7)',
            lineColor: 'rgba(255, 255, 255, 0.3)',
            particleSize: 3,
            maxSpeed: 1,
            connectDistance: 100,
            responsive: true,
            ...options
        };

        // 设置画布样式
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '0';
        this.canvas.style.pointerEvents = 'none'; // 确保不会干扰用户交互

        // 添加到DOM
        document.body.prepend(this.canvas);

        // 初始化
        this.init();

        // 监听鼠标移动
        window.addEventListener('mousemove', (event) => {
            this.mousePosition.x = event.x;
            this.mousePosition.y = event.y;
        });

        // 监听鼠标离开
        window.addEventListener('mouseout', () => {
            this.mousePosition.x = null;
            this.mousePosition.y = null;
        });

        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            this.resize();
        });
    }

    init() {
        // 设置画布大小
        this.resize();

        // 创建粒子
        this.createParticles();

        // 开始动画
        this.animate();
    }

    resize() {
        if (this.options.responsive) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    }

    createParticles() {
        this.particlesArray = [];

        for (let i = 0; i < this.options.particleCount; i++) {
            this.particlesArray.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * this.options.particleSize + 1,
                speedX: (Math.random() - 0.5) * this.options.maxSpeed,
                speedY: (Math.random() - 0.5) * this.options.maxSpeed,
                color: this.options.particleColor
            });
        }
    }

    drawParticles() {
        this.particlesArray.forEach(particle => {
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.closePath();
            this.ctx.fill();
        });
    }

    updateParticles() {
        this.particlesArray.forEach(particle => {
            // 更新位置
            particle.x += particle.speedX;
            particle.y += particle.speedY;

            // 边界检查
            if (particle.x > this.canvas.width || particle.x < 0) {
                particle.speedX = -particle.speedX;
            }
            if (particle.y > this.canvas.height || particle.y < 0) {
                particle.speedY = -particle.speedY;
            }

            // 鼠标交互
            if (this.mousePosition.x != null && this.mousePosition.y != null) {
                const dx = particle.x - this.mousePosition.x;
                const dy = particle.y - this.mousePosition.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.mousePosition.radius) {
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const force = (this.mousePosition.radius - distance) / this.mousePosition.radius;

                    particle.x += forceDirectionX * force * 2;
                    particle.y += forceDirectionY * force * 2;
                }
            }
        });
    }

    connectParticles() {
        for (let i = 0; i < this.particlesArray.length; i++) {
            for (let j = i + 1; j < this.particlesArray.length; j++) {
                const dx = this.particlesArray[i].x - this.particlesArray[j].x;
                const dy = this.particlesArray[i].y - this.particlesArray[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.options.connectDistance) {
                    // 根据距离设置线条透明度
                    const opacity = 1 - (distance / this.options.connectDistance);
                    this.ctx.strokeStyle = this.options.lineColor.replace('0.3', opacity);
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particlesArray[i].x, this.particlesArray[i].y);
                    this.ctx.lineTo(this.particlesArray[j].x, this.particlesArray[j].y);
                    this.ctx.stroke();
                }
            }
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.updateParticles();
        this.drawParticles();
        this.connectParticles();
        requestAnimationFrame(this.animate.bind(this));
    }
}

// 当DOM加载完成后初始化粒子效果
document.addEventListener('DOMContentLoaded', () => {
    // 创建粒子效果实例
    new ParticleEffect({
        particleCount: 80,  // 粒子数量
        particleColor: 'rgba(255, 255, 255, 0.7)',  // 粒子颜色
        lineColor: 'rgba(255, 255, 255, 0.3)',  // 连接线颜色
        particleSize: 3,  // 粒子大小
        maxSpeed: 0.8,  // 最大速度
        connectDistance: 120  // 连接距离
    });
});