app.controller('homeController', ['$scope', '$state',
    function ($scope, $state) {
        $scope.startVideo = function() {
            $state.go('videoView', {});
        }
    }
]);