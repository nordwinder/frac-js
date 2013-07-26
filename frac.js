// Функция, которая создает объект фрактала. Здесь происходит вычисление фрактала,
// отрисовка и изменения. Странно работать с этими объектами JS без классов.
function fracObject() {

    // Здесь будут приватные данные и методы.
    var own = {};
    // А здесь публичные.
    var that = {};

    // Базовая линия, на основе которой строится фрактал.
    own.baseline = [ { x: 50, y: 450 }, { x: 550, y: 450 } ];
    // Нормализованная базовая линия. Первая точка = (0, 0), последняя = (1, 0).
    own.normalized = [];
    // Глубина фрактала. При значении 0 фрактальная кривая соответствует базовой линии.
    // При значении 1 каждый сегмент базовой линии заменяется на копию базовой линии,
    // соответствующим образом смасштабированную и повернутую. При значении 2, это
    // происходит дважды, и так далее. При значении -1 преобразования происходят до тех
    // пор, пока отрезки не станут слишком маленькими.
    own.fracDepth = 0;
    // Вектор inverse[0] определяет заменяется ли сегмент на копию базовой линии (при
    // значении 0), либо на отраженную вдоль оси y копию (при значении 1). Вектор
    // inverse[1] = 1 - inverse[0], исключительно для удобства, векторизации не
    // хватает. И пожалуй, inverse - не лучшее название.
    own.inverse = [ [ 0 ], [ 1 ] ];

    // Нормализация. Масштабирование и поворот, ничего сложного.
    own.normalize = function() {
        own.normalized = [];
        var i, x, y, n = own.baseline.length;
        var x0 = own.baseline[0].x, y0 = own.baseline[0].y;
        var x1 = own.baseline[n-1].x, y1 = own.baseline[n-1].y;
        var d = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
        var a = Math.atan2(y1 - y0, x1 - x0);
        for (i = 0; i < n; i++) {
            x = (own.baseline[i].x - x0) / d;
            y = (own.baseline[i].y - y0) / d;
            own.normalized.push({ x: x * Math.cos(a) + y * Math.sin(a),
                y: y * Math.cos(a) - x * Math.sin(a) });
        }
    };

    // И сразу же сделаем это.
    own.normalize();

    // Преобразование нормализованной линии так, чтобы первая точка соответствовала
    // base0, последняя - base1. Мастабирование и поворот в обратную сторону.
    own.transform = function(base0, base1, inv) {
        var fig = [];
        var i, x, y, n = own.normalized.length;
        var z = inv == 0 ? 1 : -1;
        var x0 = base0.x, y0 = base0.y;
        var x1 = base1.x, y1 = base1.y;
        var d = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
        var a = Math.atan2(y1 - y0, x1 - x0);
        for (i = 0; i < n; i++) {
            x = own.normalized[i].x * d;
            y = own.normalized[i].y * d * z;
            fig.push({ x: x * Math.cos(a) - y * Math.sin(a) + x0,
                y: y * Math.cos(a) + x * Math.sin(a) + y0 });
        }
        return fig;
    };

    // Рекурсивная функция перерисовки фрактала.
    own.redrawFrac = function(context, base0, base1, depth, inv) {
        var i, fig;
        if (depth == 0 || depth < -10)
            context.lineTo(base1.x, base1.y);
        else {
            fig = own.transform(base0, base1, inv);
            for (i = 1; i < fig.length; i++)
                if (depth == 1 || (depth < 0 &&
                    Math.pow(fig[i].x - fig[i-1].x, 2) +
                    Math.pow(fig[i].y - fig[i-1].y, 2) < 3*3)
                ) {
                    context.lineTo(fig[i].x, fig[i].y);
                }
                else {
                    own.redrawFrac(context, fig[i-1], fig[i],
                                   depth-1, own.inverse[inv][i-1]);
                }
        }
    };

    // И открытая функция, для вызова при необходимости перерисовки.
    that.redraw = function(context) {
        var i, n = own.baseline.length;
        context.beginPath();
        context.moveTo(own.baseline[0].x, own.baseline[0].y);
        for (i = 1; i < n; i++)
            own.redrawFrac(context, own.baseline[i-1], own.baseline[i],
                           own.fracDepth, own.inverse[0][i-1]);
        context.stroke();
    };

    // Это понятно. Интересно, можно сделать возвращаемое значение read only?
    that.getBaseline = function() {
        return own.baseline;
    };

    that.getInverse = function() {
        return own.inverse[0];
    }

    // Проверяет, попадает ли заданная точка на вершину базовой линии.
    // Возвращает NaN, если нет.
    that.getBaselineNodeIndex = function(p) {
        var i, idx = NaN;
        for (i in own.baseline)
            if (Math.pow(own.baseline[i].x - p.x, 2) +
                Math.pow(own.baseline[i].y - p.y, 2) <= 5*5)
                idx = i;
        return idx;
    };

    // Или на отрезок базовой линии. Немного линейной алгебры.
    that.getBaselineSegmentIndex = function(p) {
        var i, a, b, c, c1, c2, idx = NaN;
        for (i = 1; i < own.baseline.length; i++) {
            var a = own.baseline[i].y - own.baseline[i-1].y;
            var b = own.baseline[i-1].x - own.baseline[i].x;
            var c = -(a * own.baseline[i].x + b * own.baseline[i].y)
            var c1 = -(b * own.baseline[i].x - a * own.baseline[i].y);
            var c2 = -(b * own.baseline[i-1].x - a * own.baseline[i-1].y);
            if ((Math.pow(a * p.x + b * p.y + c, 2) / (a*a + b*b) <= 5*5) &&
                ((b * p.x - a * p.y + c1) * (b * p.x - a * p.y + c2) <= 0))
                idx = i;
        }
        return idx;
    };

    // Добавляет новую вершину.
    that.addBaselineNode = function(index, point) {
        own.baseline.splice(index, 0, point);
        own.inverse[0].splice(index, 0, own.inverse[0][index-1]);
        own.inverse[1].splice(index, 0, own.inverse[1][index-1]);
        own.normalize();
    };

    // А может удаляет.
    that.deleteBaselineNode = function(index) {
        own.baseline.splice(index, 1);
        own.inverse[0].splice(index, 1);
        own.inverse[1].splice(index, 1);
        own.normalize();
    };

    // А может двигает.
    that.moveBaselineNode = function(index, point) {
        own.baseline[index] = point;
        own.normalize();
    };

    // Или двигает всю линию целиком.
    that.moveBaseline = function(delta) {
        for (var i in own.baseline)
            own.baseline[i] = { x: own.baseline[i].x + delta.x, y: own.baseline[i].y + delta.y };
    };

    that.toggleInverse = function(index) {
        own.inverse[0][index] = 1 - own.inverse[0][index];
        own.inverse[1][index] = 1 - own.inverse[1][index];
    };

    // Ну и устанавливает глубину, наконец.
    that.setFracDepth = function(depth) {
        own.fracDepth = depth;
    };

    return that;

};

// Начинается все после загрузки документа
document.body.onload = function() {

    var frac = fracObject();
    // Не знаю можно ли открыть контекст один раз и далее его использовать,
    // либо надо каждый раз закрывать.
    var canvas = document.getElementById("drawfrac");
    var context = canvas.getContext("2d");

    // Значения настроек.
    var showBase, showFrac;
    var baseNormColor, baseInvColor, backColor, fracColor;
    var baseWidth, fracWidth;
    var fracDepth;

    // Перерисовка, да.
    function redraw() {
        context.fillStyle = backColor;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#000000";
        if (showBase) {
            context.strokeStyle = baseNormColor;
            context.lineWidth = baseWidth;
            var base = frac.getBaseline();
            var inv = frac.getInverse();
            var n = base.length;
            for (var i = 0; i < n; i++) {
                context.beginPath();
                context.arc(base[i].x, base[i].y, 3, 0, 2*Math.PI);
                context.stroke();
            }
            context.beginPath();
            for (i = 1; i < n; i++)
                if (inv[i-1] == 0) {
                    context.moveTo(base[i-1].x, base[i-1].y);
                    context.lineTo(base[i].x, base[i].y);
                }
            context.stroke();
            context.strokeStyle = baseInvColor;
            context.beginPath();
            for (i = 1; i < n; i++)
                if (inv[i-1] == 1) {
                    context.moveTo(base[i-1].x, base[i-1].y);
                    context.lineTo(base[i].x, base[i].y);
                }
            context.stroke();
        }
        if (showFrac) {
            context.strokeStyle = fracColor;
            context.lineWidth = fracWidth;
            frac.redraw(context);
        }
    }

    // Функция, которая забирает настройки из DOM и складывает в локальные переменные.
    function updateOptions() {
        var i, color, reg = /^#[0-9a-f]{6}$|^#[0-9a-f]{3}$/i;
        showBase = document.getElementById("showbase").checked;
        showFrac = document.getElementById("showfrac").checked;
        color = document.getElementById("basenormcolor").value;
        baseNormColor = reg.test(color) ? color : "#000080";
        color = document.getElementById("baseinvcolor").value;
        baseInvColor = reg.test(color) ? color : "#800000";
        color = document.getElementById("backcolor").value;
        backColor = reg.test(color) ? color : "#D0D0D0";
        color = document.getElementById("fraccolor").value;
        fracColor = reg.test(color) ? color : "#40F040";
        i = parseInt(document.getElementById("basewidth").value);
        baseWidth = !isNaN(i) ? i : 2;
        i = parseInt(document.getElementById("fracwidth").value);
        fracWidth = !isNaN(i) ? i : 2;
        i = parseInt(document.getElementById("fracdepth").value);
        fracDepth = !isNaN(i) ? i : -1;
        frac.setFracDepth(fracDepth);
        redraw();
    }

    updateOptions();

    function getPoint(event) {
        var rect = canvas.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    // Работа с событиями мыши
    var mouseCapture = false;
    var movingPoint = NaN;      // не NaN означает перетаскивание вершины
    var movingBaseline = { x: NaN, y: NaN }; // или всей фигуры

    function mouseMove(event) {
        if (mouseCapture) {
            var p = getPoint(event);
            if (!isNaN(movingPoint)) {
                frac.moveBaselineNode(movingPoint, p);
                redraw();
            }
            else if (!isNaN(movingBaseline.x)) {
                frac.moveBaseline({ x: p.x - movingBaseline.x,
                    y: p.y - movingBaseline.y});
                movingBaseline = p;
                redraw();
            }
        }
    }

    function mouseDown(event) {
        var p = getPoint(event), i;
        if (event.shiftKey) {
            i = frac.getBaselineSegmentIndex(p);
            if (!isNaN(i)) {
                frac.addBaselineNode(i, p);
                redraw();
            }
        }
        else if (event.ctrlKey || event.keyCode == 91 || event.keyCode == 93 ||
			event.keyCode == 157 || event.keyCode == 224) {
            i = frac.getBaselineNodeIndex(p);
            if (!isNaN(i) && i != 0 && i != frac.getBaseline().length-1) {
                frac.deleteBaselineNode(i);
                redraw();
            }
        }
        else {
            i = frac.getBaselineNodeIndex(p);
            if (!isNaN(i)) {
                mouseCapture = true;
                movingPoint = i;
            }
            else {
                i = frac.getBaselineSegmentIndex(p);
                if (!isNaN(i)) {
                    frac.toggleInverse(i - 1);
                    redraw();
                }
                else {
                    mouseCapture = true;
                    movingBaseline = p;
                }
            }
        }
    }

    function mouseUp(event) {
        if (mouseCapture) {
            mouseCapture = false;
            movingPoint = NaN;
            movingBaseline = { x: NaN, y: NaN };
        }
    }

    // Привязывание функций к событиям
    canvas.addEventListener("mousedown", mouseDown);
    document.body.addEventListener("mousemove", mouseMove);
    document.body.addEventListener("mouseup", mouseUp);
    document.getElementById("showbase").onchange = updateOptions;
    document.getElementById("showfrac").onchange = updateOptions;
    document.getElementById("basenormcolor").onchange = updateOptions;
    document.getElementById("baseinvcolor").onchange = updateOptions;
    document.getElementById("backcolor").onchange = updateOptions;
    document.getElementById("fraccolor").onchange = updateOptions;
    document.getElementById("basewidth").onchange = updateOptions;
    document.getElementById("fracwidth").onchange = updateOptions;
    document.getElementById("fracdepth").onchange = updateOptions;
    // И начали...
    redraw();
}