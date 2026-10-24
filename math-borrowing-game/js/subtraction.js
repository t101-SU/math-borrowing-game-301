/**
 * 魔法糖果工坊 - 減法核心狀態機 (SubtractionEngine)
 * 精確處理四位數減法借位邏輯、劃記追蹤與跨零連續借位教學
 */

class SubtractionEngine {
    constructor(minuend, subtrahend) {
        this.reset(minuend, subtrahend);
    }

    reset(minuend, subtrahend) {
        this.rawMinuend = minuend;
        this.rawSubtrahend = subtrahend;

        // 位數拆解為陣列 [個位, 十位, 百位, 千位]
        this.minuendDigits = this.numberToDigits(minuend);
        this.subtrahendDigits = this.numberToDigits(subtrahend);
        this.originalMinuendDigits = [...this.minuendDigits];

        // 答案陣列 [個, 十, 百, 千]
        this.differenceDigits = [null, null, null, null];

        // 劃記與借位註記狀態
        // 每位包含: { struck: false, newTop: null, borrowAdd: 0, chainHistory: [] }
        this.annotations = [
            { struck: false, newTop: null, borrowAdd: 0 },
            { struck: false, newTop: null, borrowAdd: 0 },
            { struck: false, newTop: null, borrowAdd: 0 },
            { struck: false, newTop: null, borrowAdd: 0 }
        ];

        // 當前計算進行到的位數 (0: 個位, 1: 十位, 2: 百位, 3: 千位)
        this.currentCol = 0;

        // 狀態階段: 'CHECK_BORROW' (需判斷是否借位) -> 'BORROW_INPUT' (輸入借位標記) -> 'READY_SUBTRACT' (計算答案) -> 'DONE'
        this.phase = 'CHECK_BORROW';

        // 借位輸入狀態機
        this.borrowInputState = null;

        // 記錄跨零借位的待執行步驟佇列
        this.pendingBorrowChain = [];

        this.updatePhase();
    }

    numberToDigits(num) {
        const s = num.toString().padStart(4, '0');
        return [
            parseInt(s[3], 10), // 個位 (idx 0)
            parseInt(s[2], 10), // 十位 (idx 1)
            parseInt(s[1], 10), // 百位 (idx 2)
            parseInt(s[0], 10)  // 千位 (idx 3)
        ];
    }

    getColName(colIndex) {
        const names = ['個位', '十位', '百位', '千位'];
        return names[colIndex] || '';
    }

    getColUnit(colIndex) {
        const units = ['1', '10', '100', '1000'];
        return units[colIndex] || '';
    }

    getColItemName(colIndex) {
        const items = ['星星糖', '糖果罐', '分享包', '大貨箱'];
        return items[colIndex] || '';
    }

    // 取得當前位數的「有效被減數」
    getCurrentTopValue(colIndex) {
        return this.minuendDigits[colIndex];
    }

    // 取得當前位數的減數
    getCurrentBottomValue(colIndex) {
        return this.subtrahendDigits[colIndex];
    }

    // 判斷當前位數是否需要借位
    needsBorrow() {
        if (this.currentCol >= 4) return false;
        return this.getCurrentTopValue(this.currentCol) < this.getCurrentBottomValue(this.currentCol);
    }

    updatePhase() {
        if (this.currentCol >= 4) {
            this.phase = 'DONE';
            return;
        }

        if (this.needsBorrow()) {
            this.phase = 'CHECK_BORROW';
        } else {
            this.phase = 'READY_SUBTRACT';
        }
    }

    // 檢查借位鏈：找出可以借出的最近左側位數
    // 例如個位借位時，若十位是 0，需先找到百位或千位
    findBorrowSource() {
        for (let i = this.currentCol + 1; i < 4; i++) {
            if (this.minuendDigits[i] > 0) {
                return i;
            }
        }
        return -1; // 正常四位數減法 (被減數>=減數) 不會發生找不到的情況
    }

    // 產生借位操作的詳細教學文字與鏈結
    getBorrowExplanation() {
        const target = this.currentCol;
        const source = this.findBorrowSource();

        if (source === -1) {
            return { error: '數字不夠減！' };
        }

        // 鄰居直接有得借 (例如個位向十位借，十位 > 0)
        if (source === target + 1) {
            return {
                isChain: false,
                sourceCol: source,
                targetCol: target,
                message: `${this.getColName(target)}只有 ${this.getCurrentTopValue(target)} 顆，不夠減 ${this.getCurrentBottomValue(target)}！請點擊「向${this.getColName(source)}借 1」拆成 10 個！`
            };
        } else {
            // 跨零借位情況 (例如隔壁十位是 0，必須先向百位借)
            const zeroCol = target + 1;
            return {
                isChain: true,
                sourceCol: source,
                intermediateCol: zeroCol,
                targetCol: target,
                message: `哎呀！${this.getColName(zeroCol)}是 0 個，沒有糖果可以借給${this.getColName(target)}！因此${this.getColName(zeroCol)}必須先向左邊的「${this.getColName(source)}」借！點擊借位看魔法連鎖！`
            };
        }
    }

    // 啟動借位學生互動輸入流程（讓學生主動輸入：被借位後剩多少、借來之後的數字）
    startBorrowInput() {
        const source = this.findBorrowSource();
        if (source === -1) return null;

        const target = this.currentCol;
        const steps = [];

        // 複製一份暫時的數值，用以推算每一步借位後的數字
        const tempDigits = [...this.minuendDigits];

        // 1. 被借位位數的扣除歷程 (從最高來源依序往右傳遞)
        for (let curr = source; curr > target; curr--) {
            const giver = curr;
            const receiver = curr - 1;

            const giverOrig = tempDigits[giver];
            const giverRem = giverOrig - 1;
            tempDigits[giver] = giverRem;
            tempDigits[receiver] += 10;

            const isIntermediate = (curr < source);
            let promptMsg = '';
            if (!isIntermediate) {
                promptMsg = `【${this.getColName(giver)}】原本有 ${giverOrig} 個，借出 1 個後，還剩下多少？請輸入！`;
            } else {
                promptMsg = `【${this.getColName(giver)}】原本是 0，向左借來 10 後，又借出 1 個給右邊，還剩下多少？請輸入！`;
            }

            steps.push({
                type: 'REMAINDER',
                col: giver,
                giver,
                receiver,
                expected: giverRem,
                prompt: promptMsg
            });
        }

        // 2. 目標位數的接收歷程 (借來之後的數字，借來 10)
        const targetOrig = this.minuendDigits[target];
        steps.push({
            type: 'BORROW_ADD',
            col: target,
            expected: 10,
            acceptedTotal: 10 + targetOrig,
            prompt: `向左邊借了 1 個大單位，拆開後借來了多少呢？請在上方輸入借來的數字（10）：`
        });

        this.borrowInputState = {
            source,
            target,
            steps,
            stepIndex: 0,
            inputBuffer: '',
            targetFinalTop: targetOrig + 10
        };

        this.phase = 'BORROW_INPUT';

        // 劃掉第一個被借位的數字
        this.annotations[source].struck = true;

        return {
            source,
            target,
            firstStep: steps[0]
        };
    }

    getCurrentBorrowStep() {
        if (!this.borrowInputState) return null;
        return this.borrowInputState.steps[this.borrowInputState.stepIndex] || null;
    }

    clearBorrowBuffer() {
        if (this.borrowInputState) {
            this.borrowInputState.inputBuffer = '';
        }
    }

    // 處理學生在借位階段輸入的數字 (0-9)
    submitBorrowInput(inputChar) {
        if (this.phase !== 'BORROW_INPUT' || !this.borrowInputState) {
            return { valid: false };
        }

        const state = this.borrowInputState;
        const currentStep = state.steps[state.stepIndex];
        if (!currentStep) return { valid: false };

        const newBuffer = state.inputBuffer + inputChar;
        const expectedStr = currentStep.expected.toString();
        const acceptedTotalStr = currentStep.acceptedTotal ? currentStep.acceptedTotal.toString() : null;

        // 1. 完全吻合預期值（或學生直接算出借來後的總和如 15）
        if (newBuffer === expectedStr || (acceptedTotalStr && newBuffer === acceptedTotalStr)) {
            if (currentStep.type === 'REMAINDER') {
                this.annotations[currentStep.col].struck = true;
                this.annotations[currentStep.col].newTop = currentStep.expected;
                this.minuendDigits[currentStep.col] = currentStep.expected;
            } else if (currentStep.type === 'BORROW_ADD') {
                this.annotations[currentStep.col].borrowAdd = 10;
                this.minuendDigits[currentStep.col] += 10;
            }

            state.stepIndex++;
            state.inputBuffer = '';

            // 檢查是否還有下一步借位輸入
            if (state.stepIndex < state.steps.length) {
                const nextStep = state.steps[state.stepIndex];
                if (nextStep.type === 'REMAINDER') {
                    this.annotations[nextStep.col].struck = true;
                }
                return {
                    correct: true,
                    stepFinished: true,
                    allFinished: false,
                    nextStep: nextStep,
                    message: `太棒了！寫對了！接著：${nextStep.prompt}`
                };
            } else {
                // 所有借位劃記都完成了！
                this.phase = 'READY_SUBTRACT';
                const finalTop = this.getCurrentTopValue(this.currentCol);
                const bottom = this.getCurrentBottomValue(this.currentCol);
                this.borrowInputState = null;
                return {
                    correct: true,
                    stepFinished: true,
                    allFinished: true,
                    message: `太棒了！借位標記都寫對了！現在【${this.getColName(this.currentCol)}】有 ${finalTop} 個，減去 ${bottom} 個（${finalTop} − ${bottom}），答案是多少？`
                };
            }
        }

        // 2. 期望是兩位數 (如 "10")，且輸入目前是第一個位數 "1"
        if (expectedStr.length > 1 && expectedStr.startsWith(newBuffer)) {
            state.inputBuffer = newBuffer;
            return {
                correct: true,
                partial: true,
                inputBuffer: newBuffer,
                message: `已經輸入 ${newBuffer}，再按一個 ${expectedStr[1]}，就是 ${expectedStr} 囉！`
            };
        }

        // 3. 期望可能為 acceptedTotal (如 "15")，且輸入目前是第一個位數 "1"
        if (acceptedTotalStr && acceptedTotalStr.length > 1 && acceptedTotalStr.startsWith(newBuffer)) {
            state.inputBuffer = newBuffer;
            return {
                correct: true,
                partial: true,
                inputBuffer: newBuffer,
                message: `已經輸入 ${newBuffer}，請繼續輸入！`
            };
        }

        // 4. 輸入錯誤
        state.inputBuffer = '';
        let hint = '';
        if (currentStep.type === 'REMAINDER') {
            hint = `想一想：借出 1 個後還剩多少呢？答案是 ${currentStep.expected} 喔，再試一次！`;
        } else {
            hint = `想一想：借 1 當 10，借來的數字是 10 喔！請輸入 10！`;
        }

        return {
            correct: false,
            message: hint
        };
    }

    // 執行借位動作 (直接一鍵完成，亦可作為備用)
    executeBorrow() {
        const source = this.findBorrowSource();
        if (source === -1) return null;

        const target = this.currentCol;
        const steps = [];

        // 依序從 source 退位傳遞到 target
        // 例如 source = 2 (百位), target = 0 (個位)
        // 步驟 1: 百位借給十位 -> 百位 -1, 十位 +10 (變10)
        // 步驟 2: 十位借給個位 -> 十位 -1 (變9), 個位 +10
        for (let curr = source; curr > target; curr--) {
            const giver = curr;
            const receiver = curr - 1;

            // 送者減少 1
            this.minuendDigits[giver] -= 1;
            this.annotations[giver].struck = true;
            this.annotations[giver].newTop = this.minuendDigits[giver];

            // 收者增加 10
            this.minuendDigits[receiver] += 10;
            if (receiver === target) {
                // 最終目標位數
                this.annotations[receiver].borrowAdd = 10;
            } else {
                // 中繼位數（如跨零時的十位，先得到10，下一圈會再被借走1變9）
                this.annotations[receiver].struck = true;
                this.annotations[receiver].newTop = this.minuendDigits[receiver];
            }

            steps.push({
                giver,
                receiver,
                giverRemaining: this.minuendDigits[giver],
                receiverTotal: this.minuendDigits[receiver]
            });
        }

        this.updatePhase();

        return {
            source,
            target,
            steps,
            newTopValue: this.getCurrentTopValue(target)
        };
    }

    // 驗證並提交當前位數的差 (答案)
    submitDifference(inputNum) {
        if (this.phase !== 'READY_SUBTRACT') {
            return {
                correct: false,
                reason: 'PLEASE_BORROW_FIRST',
                message: `先別急著填答案！目前糖果數量還不夠減，請先向左邊借位喔！`
            };
        }

        const topVal = this.getCurrentTopValue(this.currentCol);
        const bottomVal = this.getCurrentBottomValue(this.currentCol);
        const expectedDiff = topVal - bottomVal;

        if (parseInt(inputNum, 10) === expectedDiff) {
            // 答對了！
            this.differenceDigits[this.currentCol] = expectedDiff;
            const completedCol = this.currentCol;

            // 前進到下一位數
            this.currentCol += 1;
            this.updatePhase();

            return {
                correct: true,
                completedCol,
                expectedDiff,
                isAllFinished: this.phase === 'DONE',
                message: `太棒了！${topVal} - ${bottomVal} = ${expectedDiff}！`
            };
        } else {
            return {
                correct: false,
                reason: 'WRONG_ANSWER',
                expectedDiff,
                message: `想一想：現在有 ${topVal} 個，減去 ${bottomVal} 個，還剩多少呢？再算一次看看！`
            };
        }
    }

    // 取得當前精靈的教學台詞
    getCharacterDialogue() {
        if (this.phase === 'DONE') {
            const finalAnswer = this.differenceDigits.slice().reverse().join('');
            return `🎉 恭喜你順利算出答案是 ${parseInt(finalAnswer, 10)}！你已經是借位大師囉！`;
        }

        const colName = this.getColName(this.currentCol);
        const itemName = this.getColItemName(this.currentCol);
        const top = this.getCurrentTopValue(this.currentCol);
        const bottom = this.getCurrentBottomValue(this.currentCol);

        if (this.phase === 'BORROW_INPUT') {
            const step = this.getCurrentBorrowStep();
            return step ? step.prompt : '請在直式上方輸入借位數字！';
        }

        if (this.phase === 'CHECK_BORROW') {
            const info = this.getBorrowExplanation();
            return `【${colName}】現有 ${top} 個${itemName}，但需要減去 ${bottom} 個！不夠扣了～快點擊「向左借位拆箱」吧！`;
        } else {
            return `【${colName}】現在有 ${top} 個${itemName}，減去 ${bottom} 個（${top} − ${bottom}），還剩幾個呢？請按下方數字鍵！`;
        }
    }
}

window.SubtractionEngine = SubtractionEngine;
