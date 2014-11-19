/**
 * @ignore
 * @file 一些公共的工具方法
 *
 * @author Leo Wang(wangkemiao@baidu.com)
 */

define(function (require) {

    var _ = require('underscore');
    var assert = require('./assert');

    /**
     * 工具方法的namespace
     * @module util
     */
    var util = {};

    /**
     * Generates a random GUID legal string of the given length.
     * @param {number} len 要生成串的长度
     * @return {string} 指定长度的16进制数随机串
     */
    function rand16Num(len) {
        len = len || 0;
        var result = [];
        for (var i = 0; i < len; i++) {
            result.push('0123456789abcdef'.charAt(
                Math.floor(Math.random() * 16))
            );
        }
        return result.join('');
    }

    /**
     * 生成一个全局唯一的guid，且格式符合guid规范
     * GUID 的格式为“xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx”
     * 其中每个 x 是 0-9 或 a-f 范围内的一个32位十六进制数
     * 第四版的GUID使用了新的算法，其产生的数字是一个伪随机数。
     * 它生成的GUID的第三组数字的第一位是4
     *
     * @return {string} 符合guid格式的字符串
     */
    util.guid = function() {
        var curr = (new Date()).valueOf().toString();
        return ['4b534c46',  // Fixed first group. and a trick
                rand16Num(4),
                '4' + rand16Num(3),  // The first character of 3rd group is '4'.
                rand16Num(4),
                curr.substring(0, 12)].join('-');
    };

    /**
     * 生成一个唯一性的unique id串，在这里认为是guid的mini版本，并不是uuid
     * 保证因素：按照时间粒度的唯一性
     * so 生成算法是在当前时间戳的基础上增加随机数的方式
     *
     * @return {string} 一个16位的随机字符串
     */
    util.uid = function () {
        return [
            (new Date()).valueOf().toString(),  // 取前12位
            rand16Num(4)
        ].join('');
    };

    /**
     * 错误处理
     * @param {Error|Object|Event|string} ex 错误信息
     */
    util.processError = function (ex) {

        if (ex instanceof Error) {
            window.console.error(ex.stack);
        }
        else if (ex.error instanceof Error || _.isArray(ex.error)) {
            util.processError(ex.error);
        }
        else if (_.isArray(ex)) {
            _.each(ex, util.processError);
        }
        else if (ex instanceof require('mini-event/Event')
            && ex.type === 'error') {
            window.console.error(ex.error.failType, ex.error.reason, ex);
        }
        else {
            window.console.error(ex);
        }
    };

    var toString = Object.prototype.toString;

    /**
     * 深度扩展
     * @param {Object} target 目标对象
     * @return {Object} 克隆结果
     */
    function deepExtend(target) {
        var length = arguments.length;
        if (length < 2) {
            return target;
        }
        for (var i = 1; i < length; i++) {
            simpleDeepExtend(arguments[0], arguments[i]);
        }

        return arguments[0];
    }

    /**
     * 限制针对于Object进行继承
     * 请注意，当前不支持HtmlElement的克隆，会级联
     *
     * @param {Object} target 目标对象
     * @param {Object} source 来源对象
     * @return {Object} 目标对象
     */
    function simpleDeepExtend(target, source) {

        for (var k in source) {
            if (!source.hasOwnProperty(k)) {
                continue;
            }
            var targetType = toString.call(target[k]);
            var sourceType = toString.call(source[k]);

            switch (sourceType) {
                /**
                 * 对象的extend
                 * 如果类型不匹配，则直接使用clone值
                 * else：递归
                 */
                case '[object Object]':
                    if (targetType !== sourceType) {
                        target[k] = clone(source[k]);
                    }
                    else {
                        // IE下null和undefined返回的也是这个
                        if (!target[k]) {
                            target[k] = clone(source[k]);
                        }
                        deepExtend(target[k], source[k]);
                    }
                    break;
                case '[object Array]':
                    target[k] = clone(source[k]);
                    break;
                default:
                    target[k] = source[k];
            }
        }

        return target;
    }

    /**
     * 暴露深度扩展方法
     * @method
     */
    util.deepExtend = deepExtend;

    var simpleType = {
        '[object String]': 1,
        '[object Number]': 1,
        '[object Boolean]': 1,
        '[object Null]': 1,   // 需要注意，IE下返回的是[object Object]
        '[object Undefined]': 1,  // 需要注意，IE下返回的是[object Object]
        '[object Function]': 1,
        '[object RegExp]': 1,
        '[object Date]': 1,
        '[object Error]': 1
    };

    /**
     * 克隆一个新的值
     * 请注意：
     *     不建议对类的实例引用，除非你确定没有环引用的存在
     *     不建议对类使用，因为可能会因为函数调用导致出现问题
     *
     * 因为Deferred类的实例会存在一个环引用
     * this.promise.promise = this.promise
     * 会导致无限次的clone操作
     *
     * 根据erik的建议，真正的深拷贝如果不基于类型会有很多问题
     * 而且对于函数的拷贝，尤其是call这种调用可能会导致出现问题
     *
     * @param {*} target 要被克隆的对象
     * @return {*} 克隆的结果
     */
    function clone(target) {
        var strType = toString.call(target);

        if (simpleType[strType]) {
            return target;
        }

        switch (strType) {
            case '[object Object]':
                // IE下null和undefined返回的也是这个
                if (!target) {
                    return target;
                }
                var newObj = {};
                for (var k in target) {
                    if (target.hasOwnProperty(k)) {
                        newObj[k] = clone(target[k]);
                    }
                }
                return newObj;
            case '[object Array]':
                var newArr = [];
                for (var i = 0, l = target.length; i < l; i++) {
                    newArr.push(clone(target[i]));
                }
                return newArr;
            default:
                return target;
        }
    }

    /**
     * 暴露克隆方法
     * @method
     */
    util.clone = clone;

    /**
     * 将一段Object类型的配置中符合etpl语法的变量替换为传入的数据中的值
     * 并返回替换后的Object值
     *
     * @param {Object} conf 要被替换的Object类型配置
     * @param {Object} data 数据
     * @return {Object} 替换后的新配置
     */
    function mixWith (conf, data) {
        return JSON.parse(require('etpl').compile(JSON.stringify(conf))(data));
    }

    /**
     * 暴露混合数据修正配置的方法
     * @method
     */
    util.mixWith = mixWith;

    /**
     * 对于fire中的自定义数据进行封装，统一封装到event.data中
     * 因为自定义事件的参数是如此使用：
     * fire(type, event) ?
     *     如果event不是Object
     *         则fire的参数为 {data:event, type:type, target:source}
     *     如果直接有onsth处理方法，不是on('sth')注册的
     *         则fire的参数为 event，需要注意这种情况
     *     如果是Object
     *         则fire的参数为，补充了type和target的event
     *
     * 因此，我们限制自定义参数的使用，为{ data: data }
     * 结合着自动补充的type和target，最终为
     * {
     *     data: data,
     *     type: type,
     *     target: source
     * }
     * @param {!Object} data 要使用的数据
     * @return {Object} 用于自定义事件使用的参数
     */
    util.customData = function (data) {
        assert.equals($.isPlainObject(data), true,
            '传入的data必须为一个有效的Object Map格式');

        return {
            data: data
        };
    };

    return util;
});
