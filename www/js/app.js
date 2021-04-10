// Ionic Liveswitch Example App

var app = angular.module('ionic-poc', ['ionic', 'ui.router'])

app.run(function ($ionicPlatform) {
    $ionicPlatform.ready(function () {

        if (window.cordova && window.Keyboard) {
            window.Keyboard.hideKeyboardAccessoryBar(true);
        }

        if (window.StatusBar) {
            StatusBar.styleDefault();
        }

        // Ask for android permissions. 
        // Make sure Androidmanifest lists the permissions asked.
        if (window.cordova && cordova.platformId === 'android') {
            var permissions = cordova.plugins.permissions;

            permissions.requestPermission(permissions.CAMERA, success, error);
            permissions.requestPermission(permissions.MODIFY_AUDIO_SETTINGS, success, error);
            permissions.requestPermission(permissions.RECORD_AUDIO, success, error);

            function error() {
                console.warn('Permissions not turned on.');
            }
            function success(status) {
                if (!status.hasPermission) error();
                else console.log('Permission request accepted');
            }
        }
    });
});

app.config(['$urlRouterProvider', '$stateProvider',
    function($urlRouterProvider, $stateProvider) {
        $urlRouterProvider.otherwise('/');

        $stateProvider
            .state('root', {
                url: '/',
                abstract: true,
                template: '<ui-view></ui-view>',
                controller: 'baseController'
            })
            .state('videoView', {
                url: '/videoView',
                templateUrl: 'app/components/videoView/videoView.html',
                controller: 'videoViewController'
            });
    }
])

app.run(['$state', '$window',
    function ($state, $window) {
        console.log('app run state window');
        $window.addEventListener('LaunchUrl', function (event) {
            // gets page name from url
            var page = /.*:[/]{2}([^?]*)[?]?(.*)/.exec(event.detail.url)[1];
            // redirects to page specified in url
            console.log('state: ', event, page);
            $state.go('tab.' + page, {});
        });
    }
]);
