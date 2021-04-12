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
    function ($urlRouterProvider, $stateProvider) {
        
        $urlRouterProvider.otherwise('/home');

        $stateProvider
            .state('home', {
                url: '/home',
                views: {
                    'main': {
                        templateUrl: 'app/components/home/home.html',
                    },
                }
            })
            .state('videoView', {
                url: '/videoView',
                cache: false,
                views: {
                    'main': {
                        templateUrl: 'app/components/videoView/videoView.html',
                    },
                }
            });
    }
]);
