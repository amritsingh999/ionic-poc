// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('starter', ['ionic'])

    .run(function ($ionicPlatform) {
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
    })
