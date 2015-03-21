/*! webperf - v1.0.0 - 2015-03-21
* https://github.com/gmoon/epicbattles
* Copyright (c) 2015 George Moon; Licensed Apache 2.0 */
// parse URL params
// http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
var urlParams;
var parseParams = function () {
    var match,
    pl     = /\+/g,  // Regex for replacing addition symbol with a space
    search = /([^&=]+)=?([^&]*)/g,
    decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
    query  = window.location.search.substring(1);
    urlParams = {};
    while (match = search.exec(query)) {
      urlParams[decode(match[1])] = decode(match[2]);
    }
};

window.onpopstate = parseParams;
parseParams();

var documentDomainError;
var config;
var configXHR;

if (urlParams.config.length > 0) {
  configXHR = $.get(urlParams.config, function(data) {
    config = JSON.parse(data);
  });  
}

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
  .controller('WebPerformanceController', ['$sce', '$scope', '$interval', function($sce, $scope, $interval) {
    $scope.stages = ['total', 'redirect', 'appCache', 'dns', 'tcp', 'ssl', 'request', 'response', 'processing', 'onLoad'];
    $scope.metrics = ['min', 'max', 'avg', 'stdev', 'current', 'count', 'sum'];
    $scope.visibleMetrics = ['current', 'min', 'avg', 'max'];
    $scope.errors = [];
    $scope.errorsLookup = {};

    // $scope.battle = {
    //   'samplingInterval': 10000, // milliseconds
    //   'headline': 'When serving the same TodoMVC app...',
    //   'scoring': {
    //     stage: 'total',
    //     metric: 'current'
    //   },
    //   'contestants': [{
    //     headlineLabel: 'TodoMVC AngularJS',
    //     url: $sce.trustAsResourceUrl('http://gmoon.github.io/todomvc/examples/angularjs/'),
    //     id: 'angularjs',
    //     label: 'AngularJS',
    //     labelCaption: 'angular',
    //   }, {
    //     headlineLabel: 'TodoMVC EmberJS',
    //     url: $sce.trustAsResourceUrl('http://gmoon.github.io/todomvc/examples/emberjs/'),
    //     id: 'emberjs',
    //     label: 'EmberJS',
    //     labelCaption: 'ember',
    //   }],
    //   'left': undefined,
    //   'right': undefined,
    // };

    var stop;

    $scope.initMetrics = function(stages, metrics) {
      var objStages = stages.reduce(function(objStages, stage) {
        var objMetrics = metrics.reduce(function(objMetrics, metric) {
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

    $scope.onIframeLoad = function(event) {
      $scope.processIframeLoad(event.currentTarget.id, event.currentTarget);
    };

    $scope.processIframeLoad = function(type, elem) {
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
      $scope.setMetric(type, 'redirect', redirect);
      $scope.setMetric(type, 'appCache', appCache);
      $scope.setMetric(type, 'dns', dns);
      $scope.setMetric(type, 'tcp', tcp);
      $scope.setMetric(type, 'ssl', ssl);
      $scope.setMetric(type, 'request', request);
      $scope.setMetric(type, 'response', response);
      $scope.setMetric(type, 'processing', processing);
      $scope.setMetric(type, 'onLoad', onLoad);
      $scope.setMetric(type, 'total', total);
      if ($scope.stats[$scope.battle.left.id].total.count === $scope.stats[$scope.battle.right.id].total.count) {
        $scope.recalcPercentage();
      }
    };

    $scope.setMetric = function(type, metric, current) {
      var m = $scope.stats[type][metric];
      m['current'] = current;
      m['count'] ++;
      m['sum'] += current;
      m['max'] = current > m['max'] ? current : m['max'];
      m['min'] = current < m['min'] ? current : m['min'];
      m['avg'] = Math.floor(m['sum'] / m['count']);
    };

    $scope.fight = function() {
      // Don't start a new fight if we are already fighting
      if (angular.isDefined(stop)) {
        return;
      }
      $scope.reload();
      stop = $interval(function() {
        $scope.reload();
      }, $scope.battle.samplingInterval);
    };

    $scope.reload = function() {
        try {
          $scope.battle.contestants.forEach(function(i) {
            $("#" + i.id)[0].contentWindow.location.reload();
          });
        } catch (error) {
          $scope.addError(error);
        }
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
      $scope.stats = {};
      $scope.battle.contestants.forEach(function(i) {
        $scope.stats[i.id] = $scope.initMetrics($scope.stages, $scope.metrics);
      });
    };

    $scope.clearErrorMessage = function(index) {
      $scope.errors.splice(index, 1);
    };

    $scope.addError = function(error) {
      // look for this error message
      var result = $.grep($scope.errors, function(e) {
        return e.message === error.toString();
      });
      if (result.length === 0) { // add the error to the list
        $scope.errors.push({
          message: error.toString(),
          count: 1
        });
      } else { // increment the count
        result[0].count++;
      }
    };

    $scope.promoteFighter = function(which, index) {
      $scope.battle[which] = $scope.battle.contestants[index];
      $scope.recalcPercentage();
    };

    // register 
    if (angular.isDefined(documentDomainError)) {
      $scope.addError(documentDomainError);
    }

    configXHR.done(function() {
      $scope.battle       = config;
      $scope.battle.left  = $scope.battle.contestants[0];
      $scope.battle.right = $scope.battle.contestants[1];
      $scope.battle.contestants.map(function(c) {
        c.url = $sce.trustAsResourceUrl(c.url);
      });
      $scope.$digest();
      $scope.resetFight();
      $scope.fight();
      $("#splash").toggleClass("hide");
      $("#app").toggleClass("hide");
    });

    configXHR.fail(function() {
      console.log("config get failed: "+configXHR.error());
    });

  }]);