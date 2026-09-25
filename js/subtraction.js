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

        // 狀態階段: 'CHECK_BORROW' (需判斷是否借位) -> 'READY_SUBTRACT' (可以計算並輸入答案) -> 'DONE'
        this.phase = 'CHECK_BORROW';

        // 記錄跨零借位的待執行步驟佇列 (例如十位是0，要先從百位借)
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

    // 執行借位動作 (如果跨零，分步執行或一併執行並標註歷程)
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

        if (this.phase === 'CHECK_BORROW') {
            const info = this.getBorrowExplanation();
            return `【${colName}】現有 ${top} 個${itemName}，但需要減去 ${bottom} 個！不夠扣了～快點擊「向左借位拆箱」吧！`;
        } else {
            return `【${colName}】現在有 ${top} 個${itemName}，減去 ${bottom} 個（${top} − ${bottom}），還剩幾個呢？請按下方數字鍵！`;
        }
    }
}

window.SubtractionEngine = SubtractionEngine;
