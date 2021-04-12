app.controller('videoViewController', ['$scope',
    function ($scope) {
        
        $scope.endCall = function () {
            console.log('end Call');
        }

        const Config = {
            gatewayURL: "https://f38c3ee0d1c8.ngrok.io/sync",
            apiURL: "https://cloud.liveswitch.io/",
            sharedSecret: "f311402a49a54c50bfe5e750c3e5b863a15306af8e344704944360791d0227da",
            applicationId: "ionic-poc",
            sendAudio: true,
            sendVideo: true
        }

        var me = {
            localMedia: null,
            layoutManager: new fm.liveswitch.DomLayoutManager($('#videoContainer')[0]),
            channel: null,
            peerConnections: [] //When we only have 1, its not as required to store. But will help debugging.
        };

        var UserConfig = {
            userId: "testUser01",
            deviceId: "testDevice01",
            clientId: "testClient01",
            channelClaims: [new fm.liveswitch.ChannelClaim("123321")], //TODO: Generate a channel id from server
            roles: null,
            client: null,
            token: "",
            userTag: "testTag01",
            userName: "testName01"
        }

        setupLocalMedia();

        // Step: 1
        function setupLocalMedia() {
            me.localMedia = new fm.liveswitch.LocalMedia(Config.sendAudio, true, false);
            console.log('local media', me.localMedia);

            me.layoutManager = new fm.liveswitch.DomLayoutManager(document.getElementById("videoContainer"));
            me.layoutManager.setMode(fm.liveswitch.LayoutMode.Inline);
            console.log('layout Manager', me.layoutManager);

            me.localMedia.start().then((lm) => {
                console.debug("Started local media.");

                var localView = lm.getView();
                if (localView != null) {
                    localView.id = 'localView';
                    me.layoutManager.setLocalView(localView);
                }
            });

            joinChannel();
        }

        // Step: 2
        function joinChannel() {
            console.log('joinChannel');
            UserConfig.client = new fm.liveswitch.Client(Config.gatewayURL, Config.applicationId, UserConfig.clientId, UserConfig.deviceId);
            console.log('client', UserConfig.client);
            UserConfig.client.setTag(UserConfig.userTag);
            UserConfig.client.setUserAlias(UserConfig.userName);
            UserConfig.client.setDisableWebSockets(false);
            UserConfig.token = generateToken();
            console.log('generatedToken: ', UserConfig.token);
            
            // Register with the server.
            UserConfig.client.register(UserConfig.token).then(function (channels) {
                onClientRegistered(channels);
            }, function (ex) {
                fm.liveswitch.Log.error("Error registering client", ex);
            });
        }

        // Step: 3
        function onClientRegistered(channels) {
            console.log('onClientRegistered', channels);

            fm.liveswitch.Log.debug("On Client Registered, Channels Length: " + channels.length);

            if (channels.length > 0) {
                me.channel = channels[0];

                me.channel.addOnRemoteClientJoin(function (remoteClientInfo) {
                    fm.liveswitch.Log.info('Remote client joined the channel (client ID: ' +
                        remoteClientInfo.getId() + ', device ID: ' + remoteClientInfo.getDeviceId() +
                        ', user ID: ' + remoteClientInfo.getUserId() + ', tag: ' + remoteClientInfo.getTag() + ').');
                });

                me.channel.addOnRemoteClientLeave(function (remoteClientInfo) {
                    fm.liveswitch.Log.info('Remote client left the channel (client ID: ' + remoteClientInfo.getId() +
                        ', device ID: ' + remoteClientInfo.getDeviceId() + ', user ID: ' + remoteClientInfo.getUserId() +
                        ', tag: ' + remoteClientInfo.getTag() + ').');
                });

                me.channel.addOnPeerConnectionOffer(function (peerConnectionOffer) {
                    // Accept the peer connection offer.
                    openPeerAnswerConnection(peerConnectionOffer);
                });

                for (var _b = 0, _c = me.channel.getRemoteClientInfos(); _b < _c.length; _b++) {
                    var remoteClientInfo = _c[_b];
                    openPeerOfferConnection(remoteClientInfo);
                }
            }

        }

        function generateToken() {
            console.log('generateToken', Config.applicationId, UserConfig.client.getUserId(), UserConfig.client.getDeviceId(), UserConfig.client.getId(), null, UserConfig.channelClaims, Config.sharedSecret);
            return fm.liveswitch.Token.generateClientRegisterToken(Config.applicationId, UserConfig.client.getUserId(), UserConfig.client.getDeviceId(), UserConfig.client.getId(), null, UserConfig.channelClaims, Config.sharedSecret);
        }

        // Accepting the peer connection.
        function openPeerAnswerConnection(peerConnectionOffer) {
            console.log('openPeerAnswerConnection', peerConnectionOffer);
            fm.liveswitch.Log.debug("Opening peer answer connection.");

            // Create remote media to manage incoming media.
            let remoteMedia = new fm.liveswitch.RemoteMedia();
            remoteMedia.setAudioMuted(false);
            remoteMedia.setVideoMuted(false);

            // Add the remote video view to the layout.
            if (remoteMedia.getView()) {
                remoteMedia.getView().id = 'remoteView_' + remoteMedia.getId();
            }
            me.layoutManager.addRemoteView(remoteMedia.getId(), remoteMedia.getView());

            let connection;
            let audioStream;
            let videoStream;
            if (peerConnectionOffer.getHasAudio()) {
                audioStream = new fm.liveswitch.AudioStream(me.localMedia, remoteMedia);
            }
            if (peerConnectionOffer.getHasVideo()) {
                videoStream = new fm.liveswitch.VideoStream(me.localMedia, remoteMedia);
            }
            connection = me.channel.createPeerConnection(peerConnectionOffer, audioStream, videoStream);
            me.peerConnections[connection.getId()] = connection;
            // Tag the connection (optional).
            connection.setTag('peer-answer');

            console.log('preparing peer connection');

            /*
            Embedded TURN servers are used by default.  For more information refer to:
            https://help.frozenmountain.com/docs/liveswitch/server/advanced-topics#TURNintheMediaServer
            */

            // Monitor the connection state changes.
            connection.addOnStateChange((connection) => {
                fm.liveswitch.Log.info(connection.getId() + ': Peer connection state is ' +
                    new fm.liveswitch.ConnectionStateWrapper(connection.getState()).toString() + '.');

                // Cleanup if the connection closes or fails.
                if (connection.getState() == fm.liveswitch.ConnectionState.Closing ||
                    connection.getState() == fm.liveswitch.ConnectionState.Failing) {

                    if (connection.getRemoteClosed()) {
                        fm.liveswitch.Log.info(connection.getId() + ': Remote peer closed the connection.');
                    }
                    // Remove the remote view from the layout.
                    var lm = this.layoutManager;
                    if (lm != null) {
                        lm.removeRemoteView(remoteMedia.getId());
                    }

                    remoteMedia.destroy();
                    this.logConnectionState(connection, "Peer");
                    delete this.peerConnections[connection.getId()];
                    delete this.remoteMediaMaps[remoteMedia.getId()];
                }
                else if (connection.getState() == fm.liveswitch.ConnectionState.Failed) {
                    // Note: no need to close the connection as it's done for us.
                    // Note: do not offer a new answer here. Let the offerer reoffer and then we answer normally.
                    this.logConnectionState(connection, "Peer");
                }
                else if (connection.getState() == fm.liveswitch.ConnectionState.Connected) {
                    this.logConnectionState(connection, "Peer");
                }
            });

            // Open the connection (sends an answer to the remote peer).
            connection.open();
            return connection;
        }

        function openPeerOfferConnection(remoteClientInfo) {
            console.log('openPeerOfferConnection', remoteClientInfo);
            fm.liveswitch.Log.debug("Opening peer offer connection.");

            let remoteMedia = new fm.liveswitch.RemoteMedia();
            remoteMedia.setAudioMuted(false);
            remoteMedia.setVideoMuted(false);

            // Add the remote video view to the layout.
            if (remoteMedia.getView()) {
                remoteMedia.getView().id = 'remoteView_' + remoteMedia.getId();
            }
            me.layoutManager.addRemoteView(remoteMedia.getId(), remoteMedia.getView());

            var connection;
            var audioStream = new fm.liveswitch.AudioStream(me.localMedia, remoteMedia);
            var videoStream = new fm.liveswitch.VideoStream(me.localMedia, remoteMedia);
            connection = me.channel.createPeerConnection(remoteClientInfo, audioStream, videoStream);
            me.peerConnections[connection.getId()] = connection;
            // Tag the connection (optional).
            connection.setTag("peer-offer");

            connection.addOnStateChange(function (connection) {
                fm.liveswitch.Log.info(connection.getId() + ': Peer connection state is ' +
                    new fm.liveswitch.ConnectionStateWrapper(connection.getState()).toString() + '.');
                // Cleanup if the connection closes or fails.
                if (connection.getState() == fm.liveswitch.ConnectionState.Closing ||
                    connection.getState() == fm.liveswitch.ConnectionState.Failing) {
                    if (connection.getRemoteRejected()) {
                        fm.liveswitch.Log.info(connection.getId() + ': Remote peer rejected the offer.');
                    }
                    else if (connection.getRemoteClosed()) {
                        fm.liveswitch.Log.info(connection.getId() + ': Remote peer closed the connection.');
                    }
                    // Remove the remote view from the layout.
                    var lm = me.layoutManager;
                    if (lm != null) {
                        lm.removeRemoteView(remoteMedia.getId());
                    }
                    remoteMedia.destroy();
                    delete me.peerConnections[connection.getId()];
                    fm.liveswitch.Log.info("Peer offer connection removed.");
                }
                else if (connection.getState() == fm.liveswitch.ConnectionState.Failed) {
                    // Note: no need to close the connection as it's done for us.
                    openPeerOfferConnection(remoteClientInfo);
                    fm.liveswitch.Log.error("Peer offer connection failed.");
                }
                else if (connection.getState() == fm.liveswitch.ConnectionState.Connected) {
                    fm.liveswitch.Log.info("Peer offer connection connected.");
                }
            });
            // Open the connection (sends an offer to the remote peer).
            connection.open();
            return connection;
        }
    }
]);
