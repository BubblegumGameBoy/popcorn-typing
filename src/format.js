/*
 * ============================================================
 *  数値フォーマッタ  (format.js)
 * ============================================================
 *  天文学的にインフレする粒数を短縮表記で表示する。
 *  1,234 → 1.23K / 5,600,000 → 5.6M / ... 桁がなくなったら指数表記。
 * ============================================================
 */

const UNITS = [
  '', 'K', 'M', 'B', 'T',
  'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
  'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc',
  'Vg',
];

/** 大きな数を短縮表記に。例: 12345 -> "12.3K" */
function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n < 1000) {
    // 1未満は小数1桁、それ以外は整数
    return n < 10 && n % 1 !== 0 ? n.toFixed(1) : Math.floor(n).toString();
  }
  const orig = n;
  let t = 0;
  while (n >= 1000 && t < UNITS.length - 1) { n /= 1000; t++; }
  if (n >= 1000) {
    // 単位を超えたら指数表記（割った後ではなく元の値で）
    return orig.toExponential(2).replace('e+', 'e');
  }
  // 1234.5 -> "1.23K" のように 3 桁の有効数字
  let s;
  if (n >= 100) s = n.toFixed(0);
  else if (n >= 10) s = n.toFixed(1);
  else s = n.toFixed(2);
  // 小数点以下の末尾ゼロだけ削る（整数部のゼロは消さない）
  if (s.indexOf('.') >= 0) s = s.replace(/\.?0+$/, '');
  return s + UNITS[t];
}

/** 1秒あたりなど、ゆっくり動く値向け（整数寄り） */
function fmtRate(n) {
  if (n < 10) return (Math.round(n * 10) / 10).toString();
  return fmt(n);
}

window.FORMAT = { fmt, fmtRate };
