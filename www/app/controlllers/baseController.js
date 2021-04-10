app.controller('baseController', ['$scope', '$state',
    function ($scope, $state) {

        $scope.startVideo = function() {
            console.log('Please start video');
            $state.go('videoView', {});
        }
    }
]);



