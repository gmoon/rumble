/*! rumble - v1.0.0 - 2015-03-23
* https://github.com/gmoon/epicbattles
* Copyright (c) 2015 George Moon; Licensed Apache 2.0 */
var documentDomainError;

angular.module('webPerformanceApp', ['ngSanitize'])
  // from http://stackoverflow.com/questions/17547917/angularjs-image-onload-event
  .directive('sbLoad', ['$parse', function($parse) {
    return {
      restrict: 'A',
      link: function(scope, elem, attrs) {
        var fn = $parse(attrs.sbLoad);
        elem.on('load', function(event) {
          scope.$apply(function() {
            fn(scope, {
              $event: event
            });
          });
        });
      }
    };
  }])
  .filter('percentage', ['$window', function($window) {
    return function(input, decimals, suffix) {
      decimals = angular.isNumber(decimals) ? decimals : 0;
      suffix = suffix || '%';
      if ($window.isNaN(input)) {
        return '';
      }
      return Math.round(input * Math.pow(10, decimals + 2)) / Math.pow(10, decimals) + suffix;
    };
  }])
  .filter('abs', [function() {
    return function(input) {
      return Math.abs(input);
    };
  }])
  .controller('WebPerformanceController', [
    '$sce', '$scope', '$interval', 'webPerfConfig', 'wErrors', 'wMetrics',
    function($sce, $scope, $interval, webPerfConfig, wErrors, wMetrics) {

    $scope.stages = wMetrics.getStages();
    $scope.visibleMetrics = wMetrics.getVisibleMetrics();
    $scope.errors = wErrors.getErrors();
    $scope.stats  = wMetrics.getStats();

    var stop;

    $scope.onIframeLoad = function(event) {
      wMetrics.processIframeLoad(event.currentTarget.id, event.currentTarget, $scope.battle.left.id, $scope.battle.right.id);
      if ($scope.stats[$scope.battle.left.id].total.count === $scope.stats[$scope.battle.left.id].total.count) {
        $scope.recalcPercentage();
      }
    };

    $scope.fight = function() {
      // Don't start a new fight if we are already fighting
      if (angular.isDefined(stop)) {
        return;
      }
      try {
        $scope.battle.contestants.forEach(function(i) {
          $("#" + i.id)[0].contentWindow.location.reload();
        });
      } catch (error) {
        wErrors.addError(error);
      }
      stop = $interval(function() {
        try {
          $scope.battle.contestants.forEach(function(i) {
            $("#" + i.id)[0].contentWindow.location.reload();
          });
        } catch (error) {
          wErrors.addError(error);
        }
      }, $scope.battle.samplingInterval);
    };

    $scope.recalcPercentage = function() {
      var left = $scope.stats[$scope.battle.left.id].total.current;
      var right = $scope.stats[$scope.battle.right.id].total.current;
      $scope.pctSlower = (right - left) / left;
    };

    $scope.stopFight = function() {
      if (angular.isDefined(stop)) {
        $interval.cancel(stop);
        stop = undefined;
      }
    };

    $scope.isStarted = function() {
      return angular.isDefined(stop) ? true : false;
    };

    $scope.toggleFight = function() {
      if (angular.isDefined(stop)) {
        $scope.stopFight();
      } else {
        $scope.fight();
      }
    };

    $scope.resetFight = function() {
      $scope.pctSlower = 0;
      $scope.stats = wMetrics.clearStats();
      $scope.battle.contestants.forEach(function(i) {
        $scope.stats[i.id] = wMetrics.initMetrics();
      });
    };

    $scope.clearErrorMessage = function(index) {
      wErrors.clearErrorMessage(index);
    };

    $scope.promoteFighter = function(which, index) {
      $scope.battle[which] = $scope.battle.contestants[index];
      $scope.recalcPercentage();
    };

    // register 
    if (angular.isDefined(documentDomainError)) {
      wErrors.addError(documentDomainError);
    }

    webPerfConfig.getConfig()
      .then(
        function(data){
          $scope.battle = data;
          $scope.battle.contestants.map(function(c) {
            c.url = $sce.trustAsResourceUrl(c.url);
          });
          $scope.battle.left  = $scope.battle.contestants[0];
          $scope.battle.right = $scope.battle.contestants[1];
          $scope.resetFight();
          $scope.fight();
          //$("#splash").toggleClass("hide");
          //$("#app").toggleClass("hide");
        }, 
        function(data) {
          wErrors.addError(data);
        }
      );
  }])
  .factory('webPerfConfig', function($http, $q) {
    var service = {};
    var _urlParams = {};

    var parseParams = function() {
      // parse URL params
      // http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
      var match,
      pl     = /\+/g,  // Regex for replacing addition symbol with a space
      search = /([^&=]+)=?([^&]*)/g,
      decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
      query  = window.location.search.substring(1);
      while (match = search.exec(query)) {
        _urlParams[decode(match[1])] = decode(match[2]);
      }
    };
    
    service.getConfig = function() {
      parseParams();
      var deferred = $q.defer();
      $http({
        "method": "GET",
        "url": _urlParams["config"]
      }).success(function(data) {
        deferred.resolve(data);
      }).error(function(data, status, headers, config) {
        deferred.reject([config.method, config.url, "returned", status].join(" "));
      });
      return deferred.promise;
    };
    return service;
  })
  .factory('wErrors', function() {
    var service = {};
    var _errors = [];
    service.addError = function(error) {
      // look for this error message
      var result = $.grep(_errors, function(e) {
        return e.message === error.toString();
      });
      if (result.length === 0) { // add the error to the list
        _errors.push({
          message: error.toString(),
          count: 1
        });
      } else { // increment the count
        result[0].count++;
      }
    };

    service.clearErrorMessage = function(index) {
      _errors.splice(index, 1);
    };

    service.getErrors = function() {
      return _errors;
    };

    return service;
  })
  .factory('wMetrics', function() {
    var service = {};
    var _stages = ['total', 'redirect', 'appCache', 'dns', 'tcp', 'ssl', 'request', 'response', 'processing', 'onLoad'];
    var _metrics = ['min', 'max', 'avg', 'stdev', 'current', 'count', 'sum'];
    var _visibleMetrics = ['current', 'min', 'avg', 'max'];
    var _stats = {};

    service.getStages = function() {
      return _stages;
    };
    service.getVisibleMetrics = function() {
      return _visibleMetrics;
    };
    service.getStats = function() {
      return _stats;
    };
    service.clearStats = function() {
      _stats = {};
      return _stats;
    };
    service.initMetrics = function() {
      var objStages = _stages.reduce(function(objStages, stage) {
        var objMetrics = _metrics.reduce(function(objMetrics, metric) {
          if (metric === 'min') {
            objMetrics[metric] = 1000000;
          } else {
            objMetrics[metric] = 0;
          }
          return objMetrics;
        }, {});
        objStages[stage] = objMetrics;
        return objStages;
      }, {});
      return objStages;
    };
    var _setMetric = function(type, metric, current) {
      var m = _stats[type][metric];
      m['current'] = current;
      m['count'] ++;
      m['sum'] += current;
      m['max'] = current > m['max'] ? current : m['max'];
      m['min'] = current < m['min'] ? current : m['min'];
      m['avg'] = Math.floor(m['sum'] / m['count']);
    };

    service.processIframeLoad = function(type, elem) {
      var timing = elem.contentWindow.performance.timing;
      var navStart = timing.navigationStart;
      var redirect = timing.redirectEnd - timing.redirectStart;
      var appCache = timing.domainLookupStart - timing.fetchStart;
      var dns = timing.domainLookupEnd - timing.domainLookupStart;
      var tcp = timing.connectEnd - timing.connectStart;
      var ssl = timing.secureConnectionStart > 0 ? timing.connectEnd - timing.secureConnectionStart : 0;
      var request = timing.responseStart - timing.requestStart;
      var response = timing.responseEnd - timing.responseStart;
      var processing = timing.loadEventStart - timing.domLoading;
      var onLoad = timing.loadEventEnd - timing.loadEventStart;
      var total = timing.loadEventEnd - navStart;
      _setMetric(type, 'redirect', redirect);
      _setMetric(type, 'appCache', appCache);
      _setMetric(type, 'dns', dns);
      _setMetric(type, 'tcp', tcp);
      _setMetric(type, 'ssl', ssl);
      _setMetric(type, 'request', request);
      _setMetric(type, 'response', response);
      _setMetric(type, 'processing', processing);
      _setMetric(type, 'onLoad', onLoad);
      _setMetric(type, 'total', total);
    };
    service.initMetrics(); 
    return service;
  });

