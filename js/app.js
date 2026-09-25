/**
 * 魔法糖果工坊 - 應用程式主控制模組 (App Controller)
 * 串接音效、糖果教具、數學狀態機、關卡流轉與視覺特效
 */

class MathBorrowingApp {
    constructor() {
        this.currentMode = 'tutorial'; // 'tutorial' | 'adventure' | 'custom'
        this.currentLevel = 1;
        
        // 預設關卡庫
        this.levelProblems = {
            1: [
                { m: 4562, s: 2137, desc: '個位借位練習' },
                { m: 5826, s: 2473, desc: '十位借位練習' },
                { m: 6384, s: 2721, desc: '百位借位練習' }
            ],
            2: [
                { m: 5324, s: 2868, desc: '連續借位挑戰：個位借完十位借！' },
                { m: 7243, s: 3587, desc: '三重連續借位挑戰！' }
            ],
            3: [
                { m: 4005, s: 1837, desc: '大魔王關：跨零連續借位！' },
                { m: 5030, s: 2465, desc: '大魔王關：中間有零借位！' },
                { m: 6000, s: 2345, desc: '終極大魔王：連續三個零借位！' }
            ]
        };
        this.levelSubIndex = 0;

        // 初始化畫布與元件
        this.candyStore = new CandyStore('candy-columns');
        this.engine = null;
        this.confettiActive = false;

        this.initDOM();
        this.initConfetti();
        this.bindEvents();

        // 啟動預設示範題
        this.startProblem(3425, 1687);
    }

    initDOM() {
        // 導航與模式按鈕
        this.soundBtn = document.getElementById('btn-sound');
        this.soundIcon = document.getElementById('sound-icon');
        this.helpBtn = document.getElementById('btn-help');
        this.modeTabs = document.querySelectorAll('.tab-btn');
        this.adventurePanel = document.getElementById('adventure-panel');
        this.customPanel = document.getElementById('custom-panel');
        this.levelChips = document.querySelectorAll('.level-chip');

        // 自訂輸入
        this.inputMinuend = document.getElementById('input-minuend');
        this.inputSubtrahend = document.getElementById('input-subtrahend');
        this.btnStartCustom = document.getElementById('btn-start-custom');
        this.btnRandomCustom = document.getElementById('btn-random-custom');

        // 對話與步驟指示
        this.dialogText = document.getElementById('dialog-text');
        this.stepIndicator = document.getElementById('step-indicator');

        // 操作按鈕與鍵盤
        this.btnBorrow = document.getElementById('btn-borrow');
        this.numKeys = document.querySelectorAll('.num-key');

        // 彈窗
        this.modalVictory = document.getElementById('modal-victory');
        this.modalVictoryMsg = document.getElementById('modal-victory-msg');
        this.btnNextQuestion = document.getElementById('btn-next-question');
        this.modalHelp = document.getElementById('modal-help');
        this.btnCloseHelp = document.getElementById('btn-close-help');

        // 直式算式欄位參照
        this.annoCells = [
            document.getElementById('anno-col-0'),
            document.getElementById('anno-col-1'),
            document.getElementById('anno-col-2'),
            document.getElementById('anno-col-3')
        ];
        this.minCells = [
            document.getElementById('min-col-0'),
            document.getElementById('min-col-1'),
            document.getElementById('min-col-2'),
            document.getElementById('min-col-3')
        ];
        this.subCells = [
            document.getElementById('sub-col-0'),
            document.getElementById('sub-col-1'),
            document.getElementById('sub-col-2'),
            document.getElementById('sub-col-3')
        ];
        this.ansCells = [
            document.getElementById('ans-col-0'),
            document.getElementById('ans-col-1'),
            document.getElementById('ans-col-2'),
            document.getElementById('ans-col-3')
        ];
    }

    bindEvents() {
        // 音效開關
        this.soundBtn.addEventListener('click', () => {
            const isMuted = window.soundEngine.toggleMute();
            this.soundIcon.textContent = isMuted ? '🔇' : '🔊';
            this.soundBtn.innerHTML = `${this.soundIcon.outerHTML} 音效${isMuted ? '關' : '開'}`;
        });

        // 借位秘笈開關
        this.helpBtn.addEventListener('click', () => {
            window.soundEngine.playClick();
            this.modalHelp.classList.add('show');
        });
        this.btnCloseHelp.addEventListener('click', () => {
            window.soundEngine.playClick();
            this.modalHelp.classList.remove('show');
        });

        // 模式切換
        this.modeTabs.forEach(btn => {
            btn.addEventListener('click', (e) => {
                window.soundEngine.playClick();
                this.modeTabs.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.switchMode(btn.dataset.mode);
            });
        });

        // 闖關關卡選擇
        this.levelChips.forEach(chip => {
            chip.addEventListener('click', () => {
                window.soundEngine.playClick();
                this.levelChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.currentLevel = parseInt(chip.dataset.level, 10);
                this.levelSubIndex = 0;
                this.loadAdventureProblem();
            });
        });

        // 自訂出題確認與隨機
        this.btnStartCustom.addEventListener('click', () => {
            window.soundEngine.playClick();
            this.handleCustomStart();
        });
        this.btnRandomCustom.addEventListener('click', () => {
            window.soundEngine.playClick();
            this.generateRandomProblem();
        });

        // 借位按鈕點擊
        this.btnBorrow.addEventListener('click', () => {
            this.handleBorrowClick();
        });

        // 虛擬數字鍵盤點擊
        this.numKeys.forEach(key => {
            key.addEventListener('click', () => {
                const val = key.dataset.val;
                this.handleNumberInput(val);
            });
        });

        // 支援實體鍵盤 (0-9) 與空白鍵借位
        window.addEventListener('keydown', (e) => {
            if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
                this.handleNumberInput(e.key);
            } else if (e.key === ' ' || e.key === 'b' || e.key === 'B') {
                if (!this.btnBorrow.disabled) {
                    this.handleBorrowClick();
                }
            }
        });

        // 勝利彈窗「下一題」按鈕
        this.btnNextQuestion.addEventListener('click', () => {
            window.soundEngine.playClick();
            this.modalVictory.classList.remove('show');
            this.stopConfetti();
            this.handleNextProblemFlow();
        });
    }

    switchMode(mode) {
        this.currentMode = mode;
        this.adventurePanel.style.display = (mode === 'adventure') ? 'flex' : 'none';
        this.customPanel.style.display = (mode === 'custom') ? 'flex' : 'none';

        if (mode === 'tutorial') {
            this.startProblem(3425, 1687);
        } else if (mode === 'adventure') {
            this.levelSubIndex = 0;
            this.loadAdventureProblem();
        } else if (mode === 'custom') {
            this.handleCustomStart();
        }
    }

    loadAdventureProblem() {
        const pool = this.levelProblems[this.currentLevel];
        const prob = pool[this.levelSubIndex % pool.length];
        this.startProblem(prob.m, prob.s, `【第 ${this.currentLevel} 關】${prob.desc}`);
    }

    handleCustomStart() {
        let m = parseInt(this.inputMinuend.value, 10);
        let s = parseInt(this.inputSubtrahend.value, 10);

        if (isNaN(m) || m < 1000 || m > 9999) {
            alert('被減數請輸入四位數（1000 ~ 9999）喔！');
            this.inputMinuend.value = 3425;
            return;
        }
        if (isNaN(s) || s < 1 || s >= m) {
            alert('減數必須小於被減數喔！');
            this.inputSubtrahend.value = 1687;
            return;
        }

        this.startProblem(m, s, '自由出題練習');
    }

    generateRandomProblem() {
        // 隨機產生一個包含借位的四位數算式
        const m = Math.floor(Math.random() * 7000) + 2500; // 2500 ~ 9500
        const s = Math.floor(Math.random() * (m - 1000)) + 500;
        this.inputMinuend.value = m;
        this.inputSubtrahend.value = s;
        this.startProblem(m, s, '🎲 隨機趣味題目');
    }

    // 開始一題新算式
    startProblem(minuend, subtrahend, customTitle = null) {
        this.engine = new SubtractionEngine(minuend, subtrahend);
        this.stopConfetti();
        this.renderAll();

        if (customTitle) {
            this.dialogText.textContent = `${customTitle}！我們現在從「個位」開始計算喔！`;
        } else {
            this.updateDialogue();
        }
    }

    // 更新直式算式與教具畫面
    renderAll() {
        this.renderVerticalEquation();
        this.renderCandyStore();
        this.updateControlState();
        this.updateDialogue();
    }

    renderVerticalEquation() {
        // 渲染被減數與減數
        for (let i = 0; i < 4; i++) {
            this.minCells[i].textContent = this.engine.originalMinuendDigits[i];
            this.subCells[i].textContent = this.engine.subtrahendDigits[i];

            // 劃線斜槓處理
            if (this.engine.annotations[i].struck) {
                this.minCells[i].classList.add('struck');
            } else {
                this.minCells[i].classList.remove('struck');
            }

            // 頂部劃記數字處理 (借來的 +10 放在最上方，其下方為原數字劃記剩餘值)
            this.annoCells[i].innerHTML = '';
            if (this.engine.annotations[i].borrowAdd > 0) {
                const addTen = document.createElement('span');
                addTen.className = 'anno-add-ten';
                addTen.textContent = `+10`;
                this.annoCells[i].appendChild(addTen);
            }
            if (this.engine.annotations[i].newTop !== null) {
                const badge = document.createElement('span');
                badge.className = 'anno-badge';
                badge.textContent = this.engine.annotations[i].newTop;
                this.annoCells[i].appendChild(badge);
            }

            // 答案格狀態
            const ansVal = this.engine.differenceDigits[i];
            if (ansVal !== null) {
                this.ansCells[i].textContent = ansVal;
                this.ansCells[i].className = 'answer-cell filled';
            } else {
                this.ansCells[i].textContent = '?';
                if (i === this.engine.currentCol && this.engine.phase !== 'DONE') {
                    this.ansCells[i].className = 'answer-cell active-target';
                } else {
                    this.ansCells[i].className = 'answer-cell';
                }
            }
        }

        // 當前計算欄位指示器
        if (this.engine.phase === 'DONE') {
            this.stepIndicator.textContent = '🎉 計算完成！';
        } else {
            this.stepIndicator.textContent = `正在計算：${this.engine.getColName(this.engine.currentCol)}`;
        }
    }

    renderCandyStore(highlightBorrow = null) {
        this.candyStore.render(
            this.engine.minuendDigits,
            this.engine.phase === 'DONE' ? null : this.engine.currentCol,
            highlightBorrow
        );
    }

    updateControlState() {
        if (this.engine.phase === 'DONE') {
            this.btnBorrow.disabled = true;
            this.btnBorrow.classList.remove('pulse-need');
            this.btnBorrow.textContent = '✨ 完成所有位數！';
            return;
        }

        const needBorrow = this.engine.needsBorrow();
        const currName = this.engine.getColName(this.engine.currentCol);

        if (needBorrow) {
            this.btnBorrow.disabled = false;
            this.btnBorrow.classList.add('pulse-need');
            const sourceCol = this.engine.findBorrowSource();
            const sourceName = sourceCol !== -1 ? this.engine.getColName(sourceCol) : '左邊';
            this.btnBorrow.innerHTML = `<span>✨</span> 向${sourceName}借位拆箱（點我拆開成 10 個！）`;
        } else {
            this.btnBorrow.disabled = true;
            this.btnBorrow.classList.remove('pulse-need');
            this.btnBorrow.innerHTML = `<span>✔️</span> ${currName}數量夠減，請直接輸入答案`;
        }
    }

    updateDialogue() {
        this.dialogText.textContent = this.engine.getCharacterDialogue();
    }

    // 處理點擊「向左借位」
    handleBorrowClick() {
        if (this.engine.phase !== 'CHECK_BORROW') return;

        window.soundEngine.playClick();
        const borrowInfo = this.engine.executeBorrow();
        if (!borrowInfo) return;

        // 鎖定按鈕防止重複點擊
        this.btnBorrow.disabled = true;

        // 播放糖果拆解飛行动畫
        this.candyStore.animateBorrow(borrowInfo.source, borrowInfo.target, () => {
            this.renderCandyStore({ from: borrowInfo.source, to: borrowInfo.target });
            this.renderVerticalEquation();
            this.updateControlState();
            const top = borrowInfo.newTopValue;
            const bottom = this.engine.getCurrentBottomValue(this.engine.currentCol);
            this.dialogText.textContent = `✨ 借位成功！現在${this.engine.getColName(this.engine.currentCol)}有 ${top} 個了，夠減囉！快算算看剩下多少（${top} − ${bottom}）！`;
        });
    }

    // 處理輸入數字答案
    handleNumberInput(numStr) {
        if (this.engine.phase === 'DONE') return;

        window.soundEngine.playClick();
        const result = this.engine.submitDifference(numStr);

        if (result.correct) {
            window.soundEngine.playCorrect();
            this.renderAll();

            if (result.isAllFinished) {
                // 全部算完了！過關慶祝
                setTimeout(() => {
                    this.triggerVictory();
                }, 400);
            } else {
                this.dialogText.textContent = `${result.message} 接著我們來算「${this.engine.getColName(this.engine.currentCol)}」！`;
            }
        } else {
            // 答錯提示
            window.soundEngine.playWrong();
            const activeCell = this.ansCells[this.engine.currentCol];
            if (activeCell) {
                activeCell.classList.add('shake-source');
                setTimeout(() => activeCell.classList.remove('shake-source'), 400);
            }
            this.dialogText.textContent = result.message;
        }
    }

    // 勝利與彩花特效
    triggerVictory() {
        window.soundEngine.playVictory();
        this.startConfetti();

        const diffStr = this.engine.differenceDigits.slice().reverse().join('');
        this.modalVictoryMsg.innerHTML = `
            算式：<strong>${this.engine.rawMinuend} − ${this.engine.rawSubtrahend} = ${parseInt(diffStr, 10)}</strong><br>
            你成功搞懂了千、百、十、個位退位的奧秘，太優秀了！⭐ ⭐ ⭐
        `;
        this.modalVictory.classList.add('show');
    }

    handleNextProblemFlow() {
        if (this.currentMode === 'adventure') {
            this.levelSubIndex++;
            this.loadAdventureProblem();
        } else if (this.currentMode === 'custom') {
            this.generateRandomProblem();
        } else {
            // 示範模式結束後，邀請進入闖關模式
            const btnAdv = document.querySelector('.tab-btn[data-mode="adventure"]');
            if (btnAdv) btnAdv.click();
        }
    }

    // ================== 原生 Canvas 慶祝紙花特效 ==================
    initConfetti() {
        this.canvas = document.getElementById('confetti-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];

        window.addEventListener('resize', () => {
            if (this.canvas) {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
            }
        });
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    startConfetti() {
        this.confettiActive = true;
        this.particles = [];
        const colors = ['#ff6b8b', '#ffb830', '#2ec4b6', '#4361ee', '#7209b7', '#fde047'];

        for (let i = 0; i < 90; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height - this.canvas.height,
                size: Math.random() * 10 + 6,
                color: colors[Math.floor(Math.random() * colors.length)],
                speedY: Math.random() * 4 + 2,
                speedX: (Math.random() - 0.5) * 3,
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 6
            });
        }
        this.renderConfetti();
    }

    stopConfetti() {
        this.confettiActive = false;
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    renderConfetti() {
        if (!this.confettiActive) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles.forEach(p => {
            p.y += p.speedY;
            p.x += p.speedX;
            p.rotation += p.rotSpeed;

            if (p.y > this.canvas.height) {
                p.y = -15;
                p.x = Math.random() * this.canvas.width;
            }

            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate((p.rotation * Math.PI) / 180);
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            this.ctx.restore();
        });

        requestAnimationFrame(() => this.renderConfetti());
    }
}

// 頁面載入完成後初始化
window.addEventListener('DOMContentLoaded', () => {
    window.app = new MathBorrowingApp();
});
