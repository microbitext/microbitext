/**
 * Base on OLED Package from microbit/micropython Chinese community.
 * Base on microsoft NeoPixel driver.
 * https://github.com/makecode-extensions/OLED12864_I2C
 * https://github.com/microsoft/pxt-ws2812b
 * https://github.com/Microsoft/pxt-neopixel
 */

// 6x8 font
const Font_5x7 = hex`000000000000005F00000007000700147F147F14242A072A12231308646237495522500005030000001C2241000041221C00082A1C2A0808083E080800503000000808080808006060000020100804023E5149453E00427F400042615149462141454B311814127F1027454545393C4A49493001710905033649494936064949291E003636000000563600000008142241141414141441221408000201510906324979413E7E1111117E7F494949363E414141227F4141221C7F494949417F090901013E414151327F0808087F00417F41002040413F017F081422417F404040407F0204027F7F0408107F3E4141413E7F090909063E4151215E7F09192946464949493101017F01013F4040403F1F2040201F7F2018207F63140814630304780403615149454300007F4141020408102041417F000004020102044040404040000102040020545454787F484444383844444420384444487F3854545418087E090102081454543C7F0804047800447D40002040443D00007F10284400417F40007C041804787C0804047838444444387C14141408081414187C7C080404084854545420043F4440203C4040207C1C2040201C3C4030403C44281028440C5050503C4464544C44000836410000007F000000413608000201020402`

//% weight=50 color=#0855AA icon="O" block="显示屏"
namespace OLED12864_I2C {
    export enum DISPLAY_ONOFF {
        //% block="ON"
        DISPLAY_ON = 1,
        //% block="OFF"
        DISPLAY_OFF = 0
    }

    const MIN_X = 0
    const MIN_Y = 0
    const MAX_X = 127
    const MAX_Y = 63

    let _I2CAddr = 60
    let _screen = pins.createBuffer(1025)
    let _buf2 = pins.createBuffer(2)
    let _buf3 = pins.createBuffer(3)
    let _buf4 = pins.createBuffer(4)
    let _buf7 = pins.createBuffer(7)
    _buf7[0] = 0x40
    let _DRAW = 1
    let _cx = 0
    let _cy = 0

    function cmd1(d: number) {
        let n = d % 256;
        pins.i2cWriteNumber(_I2CAddr, n, NumberFormat.UInt16BE);
    }

    function cmd2(d1: number, d2: number) {
        _buf3[0] = 0;
        _buf3[1] = d1;
        _buf3[2] = d2;
        pins.i2cWriteBuffer(_I2CAddr, _buf3);
    }

    function cmd3(d1: number, d2: number, d3: number) {
        _buf4[0] = 0;
        _buf4[1] = d1;
        _buf4[2] = d2;
        _buf4[3] = d3;
        pins.i2cWriteBuffer(_I2CAddr, _buf4);
    }

    function set_pos(col: number = 0, page: number = 0) {
        cmd1(0xb0 | page) // page number
        cmd1(0x00 | (col % 16)) // lower start column address
        cmd1(0x10 | (col >> 4)) // upper start column address    
    }

    // clear bit
    function clrbit(d: number, b: number): number {
        if (d & (1 << b))
            d -= (1 << b)
        return d
    }

    /**
     * draw / refresh screen
     */
    function draw(d: number) {
        if (d > 0) {
            set_pos()
            pins.i2cWriteBuffer(_I2CAddr, _screen)
        }
    }

    /**
     * set pixel in OLED
     */
    //% blockId="OLED12864_I2C_PIXEL" block="画点在 x %x|y %y|颜色 %color"
    //% x.max=128 x.min=0 x.defl=0
    //% y.max=64 y.min=0 y.defl=0
    //% color.max=1 color.min=0 color.defl=1
    //% weight=65 blockGap=8
    export function pixel(x: number, y: number, color: number = 1) {
        let page = y >> 3
        let shift_page = y % 8
        let ind = x + page * 128 + 1
        let b = (color) ? (_screen[ind] | (1 << shift_page)) : clrbit(_screen[ind], shift_page)
        _screen[ind] = b
        if (_DRAW) {
            set_pos(x, page)
            _buf2[0] = 0x40
            _buf2[1] = b
            pins.i2cWriteBuffer(_I2CAddr, _buf2)
        }
    }

    function char(c: string, col: number, row: number, color: number = 1) {
        let p = (Math.min(127, Math.max(c.charCodeAt(0), 32)) - 32) * 5
        let ind = col + row * 128 + 1

        for (let i = 0; i < 5; i++) {
            _screen[ind + i] = (color > 0) ? Font_5x7[p + i] : Font_5x7[p + i] ^ 0xFF
            _buf7[i + 1] = _screen[ind + i]
        }
        _screen[ind + 5] = (color > 0) ? 0 : 0xFF
        _buf7[6] = _screen[ind + 5]
        set_pos(col, row)
        pins.i2cWriteBuffer(_I2CAddr, _buf7)
    }

    /**
     * show text in OLED
     */
    //% blockId="OLED12864_I2C_SHOWSTRING" block="显示文字 %s|在列 %x|行 %y|颜色 %color"
    //% s.defl='Hello'
    //% col.max=120 col.min=0 col.defl=0
    //% row.max=7 row.min=0 row.defl=0
    //% color.max=1 color.min=0 color.defl=1
    //% weight=80 blockGap=8 inlineInputMode=inline
    export function String(s: string, col: number, row: number, color: number = 1) {
        for (let n = 0; n < s.length; n++) {
            char(s.charAt(n), col, row, color)
            col += 6
            if (col > (MAX_X - 6)) return
        }
    }

    /**
     * show a number in OLED
     */
    //% blockId="OLED12864_I2C_NUMBER" block="显示数字 %num|在列 %x|行 %y|颜色 %color"
    //% num.defl=100
    //% col.max=120 col.min=0 col.defl=0
    //% row.max=7 row.min=0 row.defl=0
    //% color.max=1 color.min=0 color.defl=1
    //% weight=80 blockGap=8 inlineInputMode=inline
    export function Number(num: number, col: number, row: number, color: number = 1) {
        String(num.toString(), col, row, color)
    }

    function scroll() {
        _cx = 0
        _cy++
        if (_cy > 7) {
            _cy = 7
            _screen.shift(128)
            _screen[0] = 0x40
            draw(1)
        }
    }

    /**
     * print a text in OLED
     */
    //% block="打印 %s|颜色 %color|新行 %newline"
    //% s.defl="string"
    //% color.max=1 color.min=0 color.defl=1
    //% newline.defl=true
    //% weight=80 blockGap=8 inlineInputMode=inline
    export function printString(s: string, color: number, newline: boolean = true) {
        for (let n = 0; n < s.length; n++) {
            char(s.charAt(n), _cx, _cy, color)
            _cx += 6
            if (_cx > 120) {
                scroll()
            }
        }
        if (newline) {
            scroll()
        }
    }

    /**
     * print a Number in OLED
     */
    //% block="打印数字 %num|颜色 %color|新行 %newline"
    //% s.defl="0"
    //% color.max=1 color.min=0 color.defl=1
    //% newline.defl=true
    //% weight=80 blockGap=8 inlineInputMode=inline
    export function printNumber(num: number, color: number, newline: boolean = true) {
        printString(num.toString(), color, newline)
    }

    /**
     * draw a horizontal line
     */
    //% blockId="OLED12864_I2C_HLINE" block="绘制水平线在 x %x|y %y|长度 %len|颜色 %color"
    //% x.max=127 x.min=0 x.defl=0
    //% y.max=63 y.min=0 y.defl=0
    //% len.max=128 len.min=1 len.defl=16
    //% color.max=1 color.min=0 color.defl=1
    //% weight=71 blockGap=8 inlineInputMode=inline
    export function hline(x: number, y: number, len: number, color: number = 1) {
        let _sav = _DRAW
        if ((y < MIN_Y) || (y > MAX_Y)) return
        _DRAW = 0
        for (let i = x; i < (x + len); i++)
            if ((i >= MIN_X) && (i <= MAX_X))
                pixel(i, y, color)
        _DRAW = _sav
        draw(_DRAW)
    }

    /**
     * draw a vertical line
     */
    //% blockId="OLED12864_I2C_VLINE" block="绘制垂直线在 x %x|y %y|长度 %len|颜色 %color"
    //% x.max=127 x.min=0 x.defl=0
    //% y.max=63 y.min=0 y.defl=0
    //% len.max=128 len.min=1 len.defl=16
    //% color.max=1 color.min=0 color.defl=1
    //% weight=71 blockGap=8 inlineInputMode=inline
    export function vline(x: number, y: number, len: number, color: number = 1) {
        let _sav = _DRAW
        _DRAW = 0
        if ((x < MIN_X) || (x > MAX_X)) return
        for (let i = y; i < (y + len); i++)
            if ((i >= MIN_Y) && (i <= MAX_Y))
                pixel(x, i, color)
        _DRAW = _sav
        draw(_DRAW)
    }

    /**
     * draw a rectangle
     */
    //% blockId="OLED12864_I2C_RECT" block="绘制矩形在 x1 %x1|y1 %y1|x2 %x2|y2 %y2|颜色 %color"
    //% color.defl=1
    //% weight=70 blockGap=8 inlineInputMode=inline
    export function rect(x1: number, y1: number, x2: number, y2: number, color: number = 1) {
        if (x1 > x2)
            x1 = [x2, x2 = x1][0];
        if (y1 > y2)
            y1 = [y2, y2 = y1][0];
        _DRAW = 0
        hline(x1, y1, x2 - x1 + 1, color)
        hline(x1, y2, x2 - x1 + 1, color)
        vline(x1, y1, y2 - y1 + 1, color)
        vline(x2, y1, y2 - y1 + 1, color)
        _DRAW = 1
        draw(1)
    }

    /**
     * invert display
     * @param d true: invert / false: normal, eg: true
     */
    //% blockId="OLED12864_I2C_INVERT" block="反显模式 %d"
    //% weight=62 blockGap=8
    export function invert(d: boolean = true) {
        let n = (d) ? 0xA7 : 0xA6
        cmd1(n)
    }

    /**
     * clear screen
     */
    //% blockId="OLED12864_I2C_CLEAR" block="清除屏幕"
    //% weight=30 blockGap=8
    export function clear() {
        _cx = _cy = 0
        _screen.fill(0)
        _screen[0] = 0x40
        draw(1)
    }

    /**
     * turn on/off screen
     */
    //% blockId="OLED12864_I2C_ON" block="显示 %d"
    //% on.defl=1
    //% weight=62 blockGap=8
    export function display(on: DISPLAY_ONOFF=DISPLAY_ONOFF.DISPLAY_ON) {
        let d = (on == DISPLAY_ONOFF.DISPLAY_ON) ? 0xAF : 0xAE;
        cmd1(d)
    }

    /**
     * OLED initialize
     */
    //% blockId="OLED12864_I2C_init" block="初始化显示屏"
    //% weight=10 blockGap=8
    export function init() {
        cmd1(0xAE)       // SSD1306_DISPLAYOFF
        cmd1(0xA4)       // SSD1306_DISPLAYALLON_RESUME
        cmd2(0xD5, 0xF0) // SSD1306_SETDISPLAYCLOCKDIV
        cmd2(0xA8, 0x3F) // SSD1306_SETMULTIPLEX
        cmd2(0xD3, 0x00) // SSD1306_SETDISPLAYOFFSET
        cmd1(0 | 0x0)    // line #SSD1306_SETSTARTLINE
        cmd2(0x8D, 0x14) // SSD1306_CHARGEPUMP
        cmd2(0x20, 0x00) // SSD1306_MEMORYMODE
        cmd3(0x21, 0, 127) // SSD1306_COLUMNADDR
        cmd3(0x22, 0, 63)  // SSD1306_PAGEADDR
        cmd1(0xa0 | 0x1) // SSD1306_SEGREMAP
        cmd1(0xc8)       // SSD1306_COMSCANDEC
        cmd2(0xDA, 0x12) // SSD1306_SETCOMPINS
        cmd2(0x81, 0xCF) // SSD1306_SETCONTRAST
        cmd2(0xd9, 0xF1) // SSD1306_SETPRECHARGE
        cmd2(0xDB, 0x40) // SSD1306_SETVCOMDETECT
        cmd1(0xA6)       // SSD1306_NORMALDISPLAY
        cmd2(0xD6, 0)    // zoom off
        cmd1(0xAF)       // SSD1306_DISPLAYON
        clear()
    }

    init();
}  



/**
 * UltrasonicPac block
 */
//% weight=100 color=#00278D icon="\uf124" block="超声波"
//% 
namespace UltrasonicPac {
    /**
    * 获取超声波实时距离 (厘米)
    * @param echo 超声波echo信号
    * @param trig 超声波trig信号
    */
    //% weight=97 blockId=Ultrasonic block="超声波距离(ECHO %echo|TRIG %trig)"
    //% group="超声波传感器"
       export function Ultrasonic(echo: DigitalPin, trig: DigitalPin): number {
           //init pins
       let echoPin:DigitalPin = echo;
       let trigPin:DigitalPin = trig;
       pins.setPull(echoPin, PinPullMode.PullNone);
       pins.setPull(trigPin, PinPullMode.PullNone);
               
       // send pulse
       pins.digitalWritePin(trigPin, 0);
       control.waitMicros(2);
       pins.digitalWritePin(trigPin, 1);
       control.waitMicros(10);
       pins.digitalWritePin(trigPin, 0);
       control.waitMicros(2);
       // read pulse
       let d = pins.pulseIn(echoPin, PulseValue.High, 11600);
       return Math.ceil(d/58);
       }
    
    }


/**
 * SegPac block
 */
//% weight=100 color=#50A820 icon="\uf162" block="数码管"

namespace extSegPac {
    let TM1637_CMD1 = 0x40;
    let TM1637_CMD2 = 0xC0;
    let TM1637_CMD3 = 0x80;
    let _SEGMENTS = [0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F, 0x77, 0x7C, 0x39, 0x5E, 0x79, 0x71];

    /**
     * TM1637 LED display
     */
    export class TM1637LEDs {
        buf: Buffer;
        clk: DigitalPin;
        dio: DigitalPin;
        _ON: number;
        brightness: number;
        count: number;  // number of LEDs

        /**
         * initial TM1637
         */
        init(): void {
            pins.digitalWritePin(this.clk, 0);
            pins.digitalWritePin(this.dio, 0);
            this._ON = 8;
            this.buf = pins.createBuffer(this.count);
            this.clear();
        }

        /**
         * Start 
         */
        _start() {
            pins.digitalWritePin(this.dio, 0);
            pins.digitalWritePin(this.clk, 0);
        }

        /**
         * Stop
         */
        _stop() {
            pins.digitalWritePin(this.dio, 0);
            pins.digitalWritePin(this.clk, 1);
            pins.digitalWritePin(this.dio, 1);
        }

        /**
         * send command1
         */
        _write_data_cmd() {
            this._start();
            this._write_byte(TM1637_CMD1);
            this._stop();
        }

        /**
         * send command3
         */
        _write_dsp_ctrl() {
            this._start();
            this._write_byte(TM1637_CMD3 | this._ON | this.brightness);
            this._stop();
        }

        /**
         * send a byte to 2-wire interface
         */
        _write_byte(b: number) {
            for (let i = 0; i < 8; i++) {
                pins.digitalWritePin(this.dio, (b >> i) & 1);
                pins.digitalWritePin(this.clk, 1);
                pins.digitalWritePin(this.clk, 0);
            }
            pins.digitalWritePin(this.clk, 1);
            pins.digitalWritePin(this.clk, 0);
        }

        /**
         * 设置数码管亮度, 范围是 [0-8], 0 表明关闭.
         * @param val 数码管的亮度值, eg: 7
         */
        //% blockId="TM1637_set_intensity" block="%tm|设置亮度为 %val"
        //% weight=82 blockGap=8
        //% parts="TM1637"
		//% color="#50A820"
		//% group="数码管显示"
        intensity(val: number = 7) {
            if (val < 1) {
                this.off();
                return;
            }
            if (val > 8) val = 8;
            this._ON = 8;
            this.brightness = val - 1;
            this._write_data_cmd();
            this._write_dsp_ctrl();
        }

        /**
         * set data to TM1637, with given bit
         */
        _dat(bit: number, dat: number) {
            this._write_data_cmd();
            this._start();
            this._write_byte(TM1637_CMD2 | (bit % this.count))
            this._write_byte(dat);
            this._stop();
            this._write_dsp_ctrl();
        }

        /**
         * 在指定位置显示数字. 
         * @param num 要显示的数字, eg: 5
         * @param bit 显示的位置, eg: 0
         */
        //% blockId="TM1637_showbit" block="%tm|显示数字 %num |在 %bit"
        //% weight=89 blockGap=8
        //% parts="TM1637"
		//% color="#50A820"
		//% group="数码管显示"
        showbit(num: number = 5, bit: number = 0) {
            this.buf[bit % this.count] = _SEGMENTS[num % 16]
            this._dat(bit, _SEGMENTS[num % 16])
        }

        /**
          * 显示数字. 
          * @param num 数字, eg: 0
          */
        //% blockId="TM1637_shownum" block="%tm|显示数字 %num"
        //% weight=89 blockGap=8
        //% parts="TM1637"
		//% color="#50A820"
		//% group="数码管显示"
        showNumber(num: number) {
            if (num < 0) {
                this._dat(0, 0x40) // '-'
                num = -num
            }
            else
                this.showbit(Math.idiv(num, 1000) % 10)
            this.showbit(num % 10, 3)
            this.showbit(Math.idiv(num, 10) % 10, 2)
            this.showbit(Math.idiv(num, 100) % 10, 1)
        }

        /**
          * 显示十六进制数. 
          * @param num 是一个十六进制数, eg: 0
          */
        //% blockId="TM1637_showhex" block="%tm|显示十六进制数 %num"
        //% weight=82 blockGap=8
        //% parts="TM1637"
		//% color="#50A820"
		//% group="数码管显示"
        showHex(num: number) {
            if (num < 0) {
                this._dat(0, 0x40) // '-'
                num = -num
            }
            else
                this.showbit((num >> 12) % 16)
            this.showbit(num % 16, 3)
            this.showbit((num >> 4) % 16, 2)
            this.showbit((num >> 8) % 16, 1)
        }

        /**
         * 显示或者隐藏小数点 
         * @param bit 是小数点位置, eg: 1
         * @param show 是否显示, eg: true
         */
        //% blockId="TM1637_showDP" block="%tm|在 %bit位置的小数点|显示状态: %show"
        //% weight=83 blockGap=8
        //% parts="TM1637"
		//% color="#50A820"
		//% group="数码管显示"
        showDP(bit: number = 1, show: boolean = true) {
            bit = bit % this.count
            if (show) this._dat(bit, this.buf[bit] | 0x80)
            else this._dat(bit, this.buf[bit] & 0x7F)
        }

        /**
         * 显示为0. 
         */
        //% blockId="TM1637_clear" block="%tm 显示为0"
        //% weight=84 blockGap=8
        //% parts="TM1637"
		//% color="#50A820"
		//% group="数码管显示"
        clear() {
            for (let i = 0; i < this.count; i++) {
                this._dat(i, 0)
                this.buf[i] = 0
            }
        }

        /**
         * 点亮数码管. 
         */
        //% blockId="TM1637_on" block="点亮数码管 %tm"
        //% weight=86 blockGap=8
        //% parts="TM1637"
		//% color="#50A820"
		//% group="数码管显示"
        on() {
            this._ON = 8;
            this._write_data_cmd();
            this._write_dsp_ctrl();
        }

        /**
         * 关闭数码管 LED. 
         */
        //% blockId="TM1637_off" block="关闭数码管 %tm"
        //% weight=85 blockGap=8
        //% parts="TM1637"
		//% color="#50A820"
		//% group="数码管显示"
        off() {
            this._ON = 0;
            this._write_data_cmd();
            this._write_dsp_ctrl();
        }
    }

    /**
     * 创建一个数码管变量.
     * @param clk 引脚CLK, eg: DigitalPin.P1
     * @param dio 引脚DIO, eg: DigitalPin.P2
     */
    //% weight=195 blockGap=8
    //% blockId="TM1637_create" block="创建数码管变量 CLK %clk|DIO %dio"
	//% color="#50A820"
	//% group="数码管显示"
    export function create(clk: DigitalPin, dio: DigitalPin): TM1637LEDs {
        let tm = new TM1637LEDs();
        tm.clk = clk;
        tm.dio = dio;
        tm.count = 4;
        tm.brightness = 8;
        tm.init();
        return tm;
    }

}

/**
 * NeoPixelColors
 */

enum NeoPixelColors {
    //% block=red
    Red = 0xFF0000,
    //% block=orange
    Orange = 0xFFA500,
    //% block=yellow
    Yellow = 0xFFFF00,
    //% block=green
    Green = 0x00FF00,
    //% block=blue
    Blue = 0x0000FF,
    //% block=indigo
    Indigo = 0x4b0082,
    //% block=violet
    Violet = 0x8a2be2,
    //% block=purple
    Purple = 0xFF00FF,
    //% block=white
    White = 0xFFFFFF,
    //% block=black
    Black = 0x000000
}

/**
 * Different modes for RGB or RGB+W NeoPixel strips
 */
enum NeoPixelMode {
    //% block="RGB (GRB format)"
    RGB = 0,
    //% block="RGB+W"
    RGBW = 1,
    //% block="RGB (RGB format)"
    RGB_RGB = 2
}

namespace ws2812b {
    //% shim=sendBufferAsm
    export function sendBuffer(buf: Buffer, pin: DigitalPin) {
    }
}
/**
 * RGBLeds block
 */
//% weight=99 color=#008fbe icon="\uf0eb" block="彩灯""
namespace extRGBLeds {
    /**
     * A NeoPixel strip
     */
    //% block="strip"
    export class Strip {
        buf: Buffer;
        pin: DigitalPin;
        // TODO: encode as bytes instead of 32bit
        brightness: number;
        start: number; // start offset in LED strip
        _length: number; // number of LEDs
        _mode: NeoPixelMode;
        _matrixWidth: number; // number of leds in a matrix - if any

        /**
         * Displays all leds of a given color (r, g, b range 0-255).
         * @param rgb RGB颜色
         */
        //% blockId="neopixel_set_strip_color" block="%strip|显示颜色 %rgb=neopixel_colors" 
        //% weight=69 blockGap=8
        //% parts="neopixel"
		//% group="彩灯"
        showColor(rgb: number) {
            rgb = rgb >> 0;
            this.setAllRGB(rgb);
            this.show();
        }

        /**
         * Display rainbow patterns on all leds.
         * @param startHue 彩虹的起始色调值, eg: 1
         * @param endHue 彩虹的结束色调值, eg: 360
         */
        //% blockId="neopixel_set_strip_rainbow" block="%strip|从 %startHue|到 %endHue|显示彩虹图案" 
        //% weight=69 blockGap=8
        //% parts="neopixel"
		//% group="彩灯"
        showRainbow(startHue: number = 1, endHue: number = 360) {
            if (this._length <= 0) return;

            startHue = startHue >> 0;
            endHue = endHue >> 0;
            const saturation = 100;
            const luminance = 50;
            const steps = this._length;
            const direction = HueInterpolationDirection.Clockwise;

            //hue
            const h1 = startHue;
            const h2 = endHue;
            const hDistCW = ((h2 + 360) - h1) % 360;
            const hStepCW = Math.idiv((hDistCW * 100), steps);
            const hDistCCW = ((h1 + 360) - h2) % 360;
            const hStepCCW = Math.idiv(-(hDistCCW * 100), steps);
            let hStep: number;
            if (direction === HueInterpolationDirection.Clockwise) {
                hStep = hStepCW;
            } else if (direction === HueInterpolationDirection.CounterClockwise) {
                hStep = hStepCCW;
            } else {
                hStep = hDistCW < hDistCCW ? hStepCW : hStepCCW;
            }
            const h1_100 = h1 * 100; //we multiply by 100 so we keep more accurate results while doing interpolation

            //sat
            const s1 = saturation;
            const s2 = saturation;
            const sDist = s2 - s1;
            const sStep = Math.idiv(sDist, steps);
            const s1_100 = s1 * 100;

            //lum
            const l1 = luminance;
            const l2 = luminance;
            const lDist = l2 - l1;
            const lStep = Math.idiv(lDist, steps);
            const l1_100 = l1 * 100

            //interpolate
            if (steps === 1) {
                this.setPixelColor(0, hsl(h1 + hStep, s1 + sStep, l1 + lStep))
            } else {
                this.setPixelColor(0, hsl(startHue, saturation, luminance));
                for (let i = 1; i < steps - 1; i++) {
                    const h = Math.idiv((h1_100 + i * hStep), 100) + 360;
                    const s = Math.idiv((s1_100 + i * sStep), 100);
                    const l = Math.idiv((l1_100 + i * lStep), 100);
                    this.setPixelColor(i, hsl(h, s, l));
                }
                this.setPixelColor(steps - 1, hsl(endHue, saturation, luminance));
            }
            this.show();
        }

        // /**
        //  * Displays a vertical bar graph based on the "value" and "high" values.
        //  *  If ` high ` is 0, can automatically adjust the chart.
        //  * @param value 要绘制的当前值
        //  * @param high 最大值, eg: 255
        //  */
        // //% weight=69
        // //% blockId=neopixel_show_bar_graph block="%strip|from %value|to %high|shows a bar chart." 
        // //% parts="neopixel"
		// //% group="彩灯"
        // showBarGraph(value: number, high: number): void {
        //     if (high <= 0) {
        //         this.clear();
        //         this.setPixelColor(0, NeoPixelColors.Yellow);
        //         this.show();
        //         return;
        //     }

        //     value = Math.abs(value);
        //     const n = this._length;
        //     const n1 = n - 1;
        //     let v = Math.idiv((value * n), high);
        //     if (v == 0) {
        //         this.setPixelColor(0, 0x666600);
        //         for (let i = 1; i < n; ++i)
        //             this.setPixelColor(i, 0);
        //     } else {
        //         for (let i = 0; i < n; ++i) {
        //             if (i <= v) {
        //                 const b = Math.idiv(i * 255, n1);
        //                 this.setPixelColor(i, rgb(b, 0, 255 - b));
        //             }
        //             else this.setPixelColor(i, 0);
        //         }
        //     }
        //     this.show();
        // }

        /**
         * Set the LED to a given color (r, g, and b in the range of 0-255). You need to call ` display`  visible to make changes.
         * @param pixeloffset 灯带中的位置
         * @param rgb LED的RGB颜色
         */
        //% blockId="neopixel_set_pixel_color" block="%strip|设置颜色数值为 %rgb=neopixel_colors| 在位置 %pixeloffset" 
        //% blockGap=8
        //% weight=69
        //% parts="neopixel" 
		//% group="彩灯"
        setPixelColor(pixeloffset: number, rgb: number): void {
            this.setPixelRGB(pixeloffset >> 0, rgb >> 0);
        }

        // /**
        //  * Sets the number of pixels in a matrix strip
        //  * @param width 行个数
        //  */
        // //% blockId=neopixel_set_matrix_width block="%strip|Set the width of the matrix to %width"
        // //% blockGap=8
        // //% weight=69
        // //% parts="neopixel" 
		// //% group="彩灯"
        // setMatrixWidth(width: number) {
        //     this._matrixWidth = Math.min(this._length, width >> 0);
        // }

        // /**
        //  * Set the LED to a given color (the range of r, g, b is 0-255),you need to call `  display ` visible to make changes.
        //  * @param x 位置X
        //  * @param y 位置Y
        //  * @param rgb LED的RGB颜色
        //  */
        // //% blockId="neopixel_set_matrix_color" block="%strip|Set the color of x %x|y %y| in the strip to %rgb=neopixel_colors" 
        // //% weight=69
        // //% parts="neopixel" 
		// //% group="彩灯"
        // setMatrixColor(x: number, y: number, rgb: number) {
        //     if (this._matrixWidth <= 0) return; // not a matrix, ignore
        //     x = x >> 0;
        //     y = y >> 0;
        //     rgb = rgb >> 0;
        //     const cols = Math.idiv(this._length, this._matrixWidth);
        //     if (x < 0 || x >= this._matrixWidth || y < 0 || y >= cols) return;
        //     let i = x + y * this._matrixWidth;
        //     this.setPixelColor(i, rgb);
        // }
        
        /**
         * For lights with RGB + W leds, set the white LED brightness.This applies only to the RGB + W strip.
         * @param pixeloffset 灯带中LED的位置
         * @param white LED的亮度
         */
        //% blockId="neopixel_set_pixel_white" block="%strip|设置灯带中第 %pixeloffset|个LED亮度为 %white" 
        //% blockGap=8
        //% weight=69
        //% parts="neopixel"
		//% group="彩灯"
        setPixelWhiteLED(pixeloffset: number, white: number): void {            
            if (this._mode === NeoPixelMode.RGBW) {
                this.setPixelW(pixeloffset >> 0, white >> 0);
            }
        }

        /** 
         * Send all changes to the ribbon.
         */
        //% blockId="neopixel_show" block="%strip|显示" blockGap=8
        //% weight=69
        //% parts="neopixel"
		//% group="彩灯"
        show() {
            ws2812b.sendBuffer(this.buf, this.pin);
        }

        /**
         * Turn off all leds.
         * you need to call `  display ` visible to make changes.
         */
        //% blockId="neopixel_clear" block="%strip|关闭"
        //% weight=69
        //% parts="neopixel"
		//% group="彩灯"
        clear(): void {
            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            this.buf.fill(0, this.start * stride, this._length * stride);
        }

        /**
         * Gets the number of pixels declared on the stripe
         */
        //% blockId="neopixel_length" block="%strip|长度" blockGap=8
        //% weight=69 
		//% group="彩灯"
        length() {
            return this._length;
        }

        /**
         * Set the brightness of the stripe. This flag applies only to future operations.
         * @param brightness LED亮度 0-255. eg: 255
         */
        //% blockId="neopixel_set_brightness" block="%strip|设置亮度值为 %brightness" blockGap=8
        //% weight=69
        //% parts="neopixel" 
		//% group="彩灯"
        setBrightness(brightness: number): void {
            this.brightness = brightness & 0xff;
        }

        // /**
        //  * Apply brightness to the current color using the secondary easing function.
        //  **/
        // //% blockId="neopixel_each_brightness" block="%strip|Ease the brightness" blockGap=8
        // //% weight=69
        // //% parts="neopixel" 
		// //% group="彩灯"
        // easeBrightness(): void {
        //     const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
        //     const br = this.brightness;
        //     const buf = this.buf;
        //     const end = this.start + this._length;
        //     const mid = Math.idiv(this._length, 2);
        //     for (let i = this.start; i < end; ++i) {
        //         const k = i - this.start;
        //         const ledoffset = i * stride;
        //         const br = k > mid
        //             ? Math.idiv(255 * (this._length - 1 - k) * (this._length - 1 - k), (mid * mid))
        //             : Math.idiv(255 * k * k, (mid * mid));
        //         serial.writeLine(k + ":" + br);
        //         const r = (buf[ledoffset + 0] * br) >> 8; buf[ledoffset + 0] = r;
        //         const g = (buf[ledoffset + 1] * br) >> 8; buf[ledoffset + 1] = g;
        //         const b = (buf[ledoffset + 2] * br) >> 8; buf[ledoffset + 2] = b;
        //         if (stride == 4) {
        //             const w = (buf[ledoffset + 3] * br) >> 8; buf[ledoffset + 3] = w;
        //         }
        //     }
        // }

        /** 
         * Create a light display range.
         * @param start 起始位置
         * @param length 显示长度. eg: 4
         */
        //% weight=69
        //% blockId="neopixel_range" block="%strip|从 %start|显示 %length|个LED"
        //% parts="neopixel"
        //% blockSetVariable=range
		//% group="彩灯"
        range(start: number, length: number): Strip {
            start = start >> 0;
            length = length >> 0;
            let strip = new Strip();
            strip.buf = this.buf;
            strip.pin = this.pin;
            strip.brightness = this.brightness;
            strip.start = this.start + Math.clamp(0, this._length - 1, start);
            strip._length = Math.clamp(0, this._length - (strip.start - this.start), length);
            strip._matrixWidth = 0;
            strip._mode = this._mode;
            return strip;
        }

        /**
         * Move the LED forward and clear with zero.
         * you need to call `  display ` visible to make changes.
         * @param offset 向前移动的像素数, eg: 1
         */
        //% blockId="neopixel_shift" block="%strip|向前移动的像素数为 %offset" blockGap=8
        //% weight=69
        //% parts="neopixel"
		//% group="彩灯"
        shift(offset: number = 1): void {
            offset = offset >> 0;
            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            this.buf.shift(-offset * stride, this.start * stride, this._length * stride)
        }

        /**
         * Rotate the LED forward.
         * you need to call `  display ` visible to make changes.
         * @param offset 向前旋转的像素数, eg: 1
         */
        //% blockId="neopixel_rotate" block="%strip|向前旋转的像素数为 %offset" blockGap=8
        //% weight=69
        //% parts="neopixel"
		//% group="彩灯"
        rotate(offset: number = 1): void {
            offset = offset >> 0;
            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            this.buf.rotate(-offset * stride, this.start * stride, this._length * stride)
        }

        /**
         * Set the pin for the strip connection, default to P0.
         */
        //% weight=69
        //% parts="neopixel" 
		//% group="彩灯"
        setPin(pin: DigitalPin): void {
            this.pin = pin;
            pins.digitalWritePin(this.pin, 0);
            // don't yield to avoid races on initialization
        }

        // /**
        //  * Estimate the current (mA) consumed by the current lamp configuration.
        //  */
        // //% weight=69 blockId=neopixel_power block="%strip|Electricity  (mA)"
		// //% group="彩灯"
        // power(): number {
        //     const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
        //     const end = this.start + this._length;
        //     let p = 0;
        //     for (let i = this.start; i < end; ++i) {
        //         const ledoffset = i * stride;
        //         for (let j = 0; j < stride; ++j) {
        //             p += this.buf[i + j];
        //         }
        //     }
        //     return Math.idiv(this.length(), 2) /* 0.5mA per neopixel */
        //         + Math.idiv(p * 433, 10000); /* rought approximation */
        // }

        private setBufferRGB(offset: number, red: number, green: number, blue: number): void {
            if (this._mode === NeoPixelMode.RGB_RGB) {
                this.buf[offset + 0] = red;
                this.buf[offset + 1] = green;
            } else {
                this.buf[offset + 0] = green;
                this.buf[offset + 1] = red;
            }
            this.buf[offset + 2] = blue;
        }

        private setAllRGB(rgb: number) {
            let red = unpackR(rgb);
            let green = unpackG(rgb);
            let blue = unpackB(rgb);

            const br = this.brightness;
            if (br < 255) {
                red = (red * br) >> 8;
                green = (green * br) >> 8;
                blue = (blue * br) >> 8;
            }
            const end = this.start + this._length;
            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            for (let i = this.start; i < end; ++i) {
                this.setBufferRGB(i * stride, red, green, blue)
            }
        }
        private setAllW(white: number) {
            if (this._mode !== NeoPixelMode.RGBW)
                return;

            let br = this.brightness;
            if (br < 255) {
                white = (white * br) >> 8;
            }
            let buf = this.buf;
            let end = this.start + this._length;
            for (let i = this.start; i < end; ++i) {
                let ledoffset = i * 4;
                buf[ledoffset + 3] = white;
            }
        }
        private setPixelRGB(pixeloffset: number, rgb: number): void {
            if (pixeloffset < 0
                || pixeloffset >= this._length)
                return;

            let stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            pixeloffset = (pixeloffset + this.start) * stride;

            let red = unpackR(rgb);
            let green = unpackG(rgb);
            let blue = unpackB(rgb);

            let br = this.brightness;
            if (br < 255) {
                red = (red * br) >> 8;
                green = (green * br) >> 8;
                blue = (blue * br) >> 8;
            }
            this.setBufferRGB(pixeloffset, red, green, blue)
        }
        private setPixelW(pixeloffset: number, white: number): void {
            if (this._mode !== NeoPixelMode.RGBW)
                return;

            if (pixeloffset < 0
                || pixeloffset >= this._length)
                return;

            pixeloffset = (pixeloffset + this.start) * 4;

            let br = this.brightness;
            if (br < 255) {
                white = (white * br) >> 8;
            }
            let buf = this.buf;
            buf[pixeloffset + 3] = white;
        }
    }

    /**
     * Create a colored light.
     * @param pin 彩灯连接的引脚.
     * @param numleds 条带中的LED数量, eg: 24,30,60,64
     */
    //% blockId="neopixel_create" block="引脚 %pin|,数量 %numleds|,模式 %mode"
    //% weight=69 blockGap=8
    //% parts="neopixel"
    //% trackArgs=0,2
    //% blockSetVariable=strip
	//% group="彩灯"
    export function createPixel(pin: DigitalPin, numleds: number, mode: NeoPixelMode): Strip {
        let strip = new Strip();
        let stride = mode === NeoPixelMode.RGBW ? 4 : 3;
        strip.buf = pins.createBuffer(numleds * stride);
        strip.start = 0;
        strip._length = numleds;
        strip._mode = mode;
        strip._matrixWidth = 0;
        strip.setBrightness(255)
        strip.setPin(pin)
        return strip;
    }

    /**
     * Convert red, green, and blue channels to RGB colors
     * @param red 红色通道值 0 - 255. eg: 255
     * @param green 绿色通道值 0 - 255. eg: 255
     * @param blue 蓝色通道值 0 - 255. eg: 255
     */
    //% weight=69
    //% blockId="neopixel_rgb" block="红 %red|绿 %green|蓝 %blue"
	//% group="彩灯"
    export function rgb(red: number, green: number, blue: number): number {
        return packRGB(red, green, blue);
    }

    /**
     * Gets the RGB value of a given color
    */
    //% weight=69 blockGap=8
    //% blockId="neopixel_colors" block="%color"
	//% group="彩灯"
    export function colors(color: NeoPixelColors): number {
        return color;
    }

    function packRGB(a: number, b: number, c: number): number {
        return ((a & 0xFF) << 16) | ((b & 0xFF) << 8) | (c & 0xFF);
    }
    function unpackR(rgb: number): number {
        let r = (rgb >> 16) & 0xFF;
        return r;
    }
    function unpackG(rgb: number): number {
        let g = (rgb >> 8) & 0xFF;
        return g;
    }
    function unpackB(rgb: number): number {
        let b = (rgb) & 0xFF;
        return b;
    }

    /**
     * Converts the hue saturation value to an RGB color
     * @param h 色调 0 - 360
     * @param s 饱和度 0 - 99
     * @param l 光度 0 - 99
     */
	//% weight=69
    //% blockId=neopixelHSL block="色调 %h|饱和度 %s|光度  %l"
	//% group="彩灯"
    export function hsl(h: number, s: number, l: number): number {
        h = Math.round(h);
        s = Math.round(s);
        l = Math.round(l);
        
        h = h % 360;
        s = Math.clamp(0, 99, s);
        l = Math.clamp(0, 99, l);
        let c = Math.idiv((((100 - Math.abs(2 * l - 100)) * s) << 8), 10000); //chroma, [0,255]
        let h1 = Math.idiv(h, 60);//[0,6]
        let h2 = Math.idiv((h - h1 * 60) * 256, 60);//[0,255]
        let temp = Math.abs((((h1 % 2) << 8) + h2) - 256);
        let x = (c * (256 - (temp))) >> 8;//[0,255], second largest component of this color
        let r$: number;
        let g$: number;
        let b$: number;
        if (h1 == 0) {
            r$ = c; g$ = x; b$ = 0;
        } else if (h1 == 1) {
            r$ = x; g$ = c; b$ = 0;
        } else if (h1 == 2) {
            r$ = 0; g$ = c; b$ = x;
        } else if (h1 == 3) {
            r$ = 0; g$ = x; b$ = c;
        } else if (h1 == 4) {
            r$ = x; g$ = 0; b$ = c;
        } else if (h1 == 5) {
            r$ = c; g$ = 0; b$ = x;
        }
        let m = Math.idiv((Math.idiv((l * 2 << 8), 100) - c), 2);
        let r = r$ + m;
        let g = g$ + m;
        let b = b$ + m;
        return packRGB(r, g, b);
    }

    export enum HueInterpolationDirection {
        Clockwise,
        CounterClockwise,
        Shortest
    }
}

/**
 * table_B3950
 */

let table_B3950 = [
    999, 997, 995, 993, 991,   // -40  -  -36
    989, 986, 984, 981, 978,   // -35  -  -31
    975, 972, 969, 965, 962,   // -30  -  -26
    958, 954, 949, 945, 940,   // -25  -  -21
    935, 930, 925, 919, 914,   // -20  -  -16
    908, 901, 895, 888, 881,   // -15  -  -11
    874, 867, 859, 851, 843,   // -10  -  -6
    834, 826, 817, 808, 799,   //  -5  -  -1
    789, 780, 770, 760, 749,   //   0  -  4
    739, 728, 718, 707, 696,   //   5  -  9
    685, 673, 662, 651, 639,   //  10  -  14
    628, 616, 604, 593, 581,   //  15  -  19
    570, 558, 546, 535, 523,   //  20  -  24
    512, 501, 489, 478, 467,   //  25  -  29
    456, 445, 435, 424, 414,   //  30  -  34
    404, 394, 384, 374, 364,   //  35  -  39
    355, 346, 336, 328, 319,   //  40  -  44
    310, 302, 294, 286, 278,   //  45  -  49
    270, 263, 256, 249, 242,   //  50  -  54
    235, 228, 222, 216, 210,   //  55  -  59
    204, 198, 193, 187, 182,   //  60  -  64
    177, 172, 167, 162, 158,   //  65  -  69
    153, 149, 145, 141, 137,   //  70  -  74
    133, 129, 126, 122, 119,   //  75  -  79
    115, 112, 109, 106, 103,   //  80  -  84
    100
]

/**
 * Temperature block
 */
//% weight=100 color=#BB2700 icon="\uf2c9" block="温度"
namespace ntcPac {
    /**
     * 将 NTC 的 ADC 数据转换为温度
     * @param adcpin 是ADC的输入引脚
     */
    //% weight=50 blockId="temperature" block="获取温度 %adcpin"
	//% group="温度传感器"
    export function Temperature(adcpin: AnalogPin): number {
		let ainPin:AnalogPin = adcpin;
		let adc:number = pins.analogReadPin(ainPin)
        for (let i = 0; i < table_B3950.length; i++) {
            if (adc > table_B3950[i])
                return i - 40;
        }
        return 85;
    }

}


/**
 * BMP180 block
 * https://github.com/makecode-extensions/BMP180
 */
//% weight=100 color=#70c0f0 icon="\uf042" block="气压"
namespace BMP180 {
    let BMP180_I2C_ADDR = 0x77

    function setreg(reg: number, dat: number): void {
        let buf = pins.createBuffer(2);
        buf[0] = reg;
        buf[1] = dat;
        pins.i2cWriteBuffer(BMP180_I2C_ADDR, buf);
    }


    
    function getreg(reg: number): number {
        pins.i2cWriteNumber(BMP180_I2C_ADDR, reg, NumberFormat.UInt8BE);
		
        return pins.i2cReadNumber(BMP180_I2C_ADDR, NumberFormat.UInt8BE);
    }

    function getInt8LE(reg: number): number {
        pins.i2cWriteNumber(BMP180_I2C_ADDR, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(BMP180_I2C_ADDR, NumberFormat.Int8LE);
    }

    function getUInt16LE(reg: number): number {
        pins.i2cWriteNumber(BMP180_I2C_ADDR, reg, NumberFormat.UInt8BE);
        let i2cdata = pins.i2cReadNumber(BMP180_I2C_ADDR, NumberFormat.UInt16LE);
		return (((i2cdata&0xff)<<8)|((i2cdata&0xff00)>>8))
    }

    function getInt16LE(reg: number): number {
        pins.i2cWriteNumber(BMP180_I2C_ADDR, reg, NumberFormat.UInt8BE);
		let i2cdata = pins.i2cReadNumber(BMP180_I2C_ADDR, NumberFormat.Int16LE);
		let i2cnum = (((i2cdata&0xff)<<8)|((i2cdata&0xff00)>>8));
		if (i2cnum < 0x8000)
			return i2cnum
		else
			return (0xffff0000|i2cnum)
    }

    let ac1 = getInt16LE(0xAA)
	let ac2 = getInt16LE(0xAC)
	let ac3 = getInt16LE(0xAE)
	let ac4 = getInt16LE(0xB0)
	let	ac5 = getInt16LE(0xB2)
	let ac6 = getInt16LE(0xB4)
	let b1 = getInt16LE(0xB6)
	let b2 = getInt16LE(0xB8)
	let mb = getInt16LE(0xBA)
	let mc = getInt16LE(0xBC)
	let md = getInt16LE(0xBE)
	let b5 = 0
	let T = 0
	let P = 0
	let OSS = 0
	
    function bmp180GetTemperature(ut:number): number {

	  let x1 = ((ut - ac6)*ac5) >> 15
	  let x2 = (mc << 11)/(x1 + md)
	  b5 = x1 + x2

	  let temp = ((b5 + 8)>>4)
	  temp = temp /10

	  return Math.ceil(temp)
	}

	function bmp180GetPressure(up: number): number{
	  let p=0
	  let value=0

	  let b6 = b5 - 4000
	  // Calculate B3
	  let x1 = (b2 * (b6 * b6)>>12)>>11
	  let x2 = (ac2 * b6)>>11;
	  let x3 = x1 + x2
	  let b3 = ((((ac1)*4 + x3)<<OSS) + 2)>>2

	  // Calculate B4
	  x1 = (ac3 * b6)>>13;
	  x2 = (b1 * ((b6 * b6)>>12))>>16
	  x3 = ((x1 + x2) + 2)>>2;
	  
	  let b4 = (ac4 * (x3 + 32768))>>15
	  b4 &= 0x0000FFFF;
	  let b7 = ((up - b3) * (50000>>OSS))
	  if (b7 < 0x80000000)
		p = ((b7*2)/b4)
	  else
		p = ((b7/b4))*2

	  x1 = (p>>8) * (p>>8)
	  x1 = (x1 * 3038)>>16
	  x2 = (-7357 * p)>>16
	  p += (x1 + x2 + 3791)>>4

	  return Math.ceil(p)
	}

	function bmp180ReadUT(): number{
	  // Write 0x2E into Register 0xF4
	  // This requests a temperature reading
		setreg(0xF4,0x2E)
	  // Wait at least 4.5ms
		basic.pause(10)

	  // Read two bytes from registers 0xF6 and 0xF7
		let ut = getInt16LE(0xF6);
		ut &= 0x0000FFFF;
		return ut;
	}

	function bmp180ReadUP(): number{
	  let up = 0;

	  // Write 0x34+(OSS<<6) into register 0xF4
	  // Request a pressure reading w/ oversampling setting
		setreg(0xF4,0x34 + (OSS<<6))
	  // Wait for conversion, delay time dependent on OSS
		basic.pause(10)

	  // Read register 0xF6 (MSB), 0xF7 (LSB), and 0xF8 (XLSB)
		up = getInt16LE(0xF6);
		up &= 0x0000FFFF;
	  return up;
	}

	function refresh(){
		let temp = bmp180ReadUT()
		temp = bmp180ReadUT()
		T = bmp180GetTemperature(temp)
		let up = bmp180ReadUP()
		P = bmp180GetPressure(up)
	}
    /**
     * get air pressure
     */
    //% blockId="BMP180_GET_PRESSURE" block="获取气压值"
    //% weight=80 blockGap=8
    export function pressure(): number {
		refresh()
        return P;
    }

    export function temperature(): number {
		refresh()
        return T;
    }

    export function id(): number {
        let id = getreg(0xD0)
        return id;
    }
}