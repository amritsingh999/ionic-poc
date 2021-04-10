app.controller('videoViewController', ['$scope', 
    function($scope) {
        console.log('loaded controller for video view.');


        $scope.endCall = function() {
            console.log('end Call');
        }
    }
]);
