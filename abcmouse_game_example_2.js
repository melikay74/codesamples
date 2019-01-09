var agf = agf || {};
define(['eventemitter2','game_custom_events','game_animation', 'game_drag_drop', 'game_audio', 'game_dom_utility', 'game_progress', 'game_inactivity', 'game_utility', 'game_events', 'media_state', 'data', 'graphic_manager', 'graphic_player','gametracker','gp_extension'], function() {
    'use strict';
    agf.GameVars = agf.GameVars || {
        gameTracker: null,
        baseUrl: '',
        artUrl: null,
        baseSndUrl: '/snd/',
        sndUrl: null,
        animationUrl: null,
        responseUrl: null,
        animationContainer: null,
        animationCover: null,
        preload: null,
        titleAnimation: null,
        currentAnim: null,
        bookAnim: null,
        roundAnim: null,
        affAnim:null,
        roundPhase: 0,
        roundNum: 0,
        roundPrompt: null,
        incorrectCount: 0,
        correctCount: 0,
        onReplay: false,
        rolloverObj: null,
        rolloverTimeout: 0,
        snapTweenX: null,
        snapTweenY: null,
        seqCount: 0,
        clickZones: [],
        swappedSprites:[],
        startTime: 0,
        endTime: 0,       
    };

    agf.GameMain = agf.GameMain || {
        GameVars: agf.GameVars,
        init: function() {
            agf.GameMain.setGameTracker();
            agf.GameMain.setGameUrls();
            agf.GameMain.setGameElements();
            
            // initialize game animation (parameter is string containing URL where animations reside in your asset directory)
            agf.GameAnimation.init(agf.GameVars.animationUrl);
            // initialize game media state (parameter is GameMain object literal. This is passed so that media state can check to see if your callback functions exist)
            agf.GameMediaState.init(agf.GameMain);
            // initialize game events (paramaters: (your container where you want game events to listen on), (your upstate callback function), (your downstate callback function), (your movestate function))
            agf.GameEvents.init(agf.GameVars.animationContainer,GameData.gameType,agf.GameMain.onUpState,agf.GameMain.onDownState,agf.GameMain.onMoveState);
            // initialize custom events
            agf.CustomEvents.init();
            // initialiaze game inactivity (parameter is url of inactivity mp3)
            agf.GameInactivity.init();
            agf.GameMain.playBackgroundMusic();
            agf.GameMain.loadTitleAnimation();
        },
        setGameElements: function() {
            agf.GameVars.animationContainer = document.getElementById('animationContainer'); 
            agf.GameVars.animationContainer.className += ' gpu-accelerate';
            agf.GameVars.animationCover = document.getElementById('animationCover');  
            agf.GameVars.preload = document.getElementById('preload'); 
        },
        setGameTracker: function() {
            agf.GameVars.gameTracker = null;
            agf.GameVars.gameTracker = new GameTracker(GameCid, '', '', '', 'tracker');
            agf.GameEvents.appendListener(agf.GameVars.gameTracker, 'doReplay', agf.GameMain.replayGame);
            agf.GameVars.gameTracker.start();
        },
        setGameUrls: function() {
            agf.GameVars.baseUrl = GameData.baseUrl;
            agf.GameVars.artUrl = IMGHOST + '/html5/' + agf.GameVars.baseUrl; 
            agf.GameVars.animationUrl = agf.GameVars.artUrl + 'animations/';
            agf.GameVars.sndUrl = IMGHOST + agf.GameVars.baseSndUrl + agf.GameVars.baseUrl;
            agf.GameVars.responseUrl = IMGHOST + agf.GameVars.baseSndUrl + 'response/' + agf.GameVars.baseUrl;
        },

        onUpState: function(event) {
            var _pos = agf.GameProgress.getOffSets(event);
            var _style = null;
            var hasCollision = false;
           
            if (agf.GameVars.bookAnim !== null) {
                _style = GameData.btnClickZone;
                hasCollision = agf.GameProgress.hitCheck(_pos,_style);
                if (hasCollision) {
                    if (agf.GameVars.seqCount !== GameData.roundData[agf.GameVars.roundNum].bookSeq.length) {
                        agf.GameAnimation.play(GameData.roundData[agf.GameVars.roundNum].bookSeq[agf.GameVars.seqCount],'bookTransSeq',agf.GameVars.bookAnim,null,false);
                    } else {
                        agf.GameAnimation.load(GameData.roundData[agf.GameVars.roundNum].roundAnim, 'roundAnim', agf.GameVars.animationContainer);
                        agf.GameVars.roundAnim = agf.GameAnimation.currentAnim;
                    }

                    agf.GameEvents.removeGameListeners();
                    return;
                }
            }

            if (agf.GameVars.roundAnim !== null) {
                if (event.type === 'touchend') {
                    agf.GameVars.endTime = new Date().getTime();
                    if (agf.GameVars.endTime - agf.GameVars.startTime > GameData.roWaitTime) {
                        return;
                    }
                }
                for (var i = 0; i < agf.GameVars.clickZones.length; i++) {
                    _style = agf.GameVars.clickZones[i];
                    hasCollision = agf.GameProgress.hitCheck(_pos,_style);
                    if (hasCollision) {
                        agf.GameEvents.removeGameListeners();
                        agf.GameMain.evaluate(agf.GameVars.clickZones[i]);
                        return;
                    }
                }
            }
        },
      
        onMoveState: function(event) {
            if (event.type === 'touchmove' && event.touches.length > 1) return;
            if (!touchCapable && !detectLeftButton(event)) return;
            var _pos = agf.GameProgress.getOffSets(event);
            var _style = null;
            var hasCollision = false;
            if (event.type === 'mousemove') {
                if (agf.GameVars.roundAnim !== null) {
                    for (var i = 0; i < agf.GameVars.clickZones.length; i++) {
                        _style = agf.GameVars.clickZones[i];
                        hasCollision = agf.GameProgress.hitCheck(_pos,_style);
                        if(agf.GameProgress.hitCheck(_pos,_style)) { 
                            
                            agf.GameMain.playRollover(agf.GameVars.clickZones[i]);
                            return;
                        }
                    }
                }
                agf.GameMain.resetRollover();
            }
        },

        onDownState: function(event) {
            var _pos = agf.GameProgress.getOffSets(event);
            var _style = null;
            if (event.type === 'touchstart') {
                agf.GameVars.startTime = new Date().getTime();
                if (agf.GameVars.roundAnim !== null) {
                    for (var i = 0; i < agf.GameVars.clickZones.length; i++) {
                        _style = agf.GameVars.clickZones[i];
                        var hasCollision = agf.GameProgress.hitCheck(_pos,_style);
                        if(agf.GameProgress.hitCheck(_pos,_style)) { 
                            agf.GameMain.playRollover(agf.GameVars.clickZones[i]);
                            return;
                        }
                    }
                }
                agf.GameMain.resetRollover();
            }
        },

        playBackgroundMusic: function() {
            agf.GameAudio.play(agf.GameVars.sndUrl + GameData.bgm,'background');
        },

        loadTitleAnimation: function() {
            agf.GameAnimation.load(GameData.titleAnimation.name, 'titleAnim', agf.GameVars.animationContainer);
            agf.GameVars.titleAnimation = agf.GameAnimation.currentAnim;
        },
        
        titleAnimReady: function() {
            agf.GameAnimation.play(GameData.titleAnimation.titleSeq,'titleSeq',agf.GameVars.titleAnimation,null,false);
            agf.GameVars.animationCover.style.display = 'none';
        },

        titleSeqEnd: function() {
            agf.GameAnimation.play(GameData.titleAnimation.intro,'titleIntro',agf.GameVars.titleAnimation,null,false);
        },

        titleIntroEnd: function() {
            agf.GameAnimation.play(GameData.titleAnimation.playloop,'titlePlayBtnLoop',agf.GameVars.titleAnimation,null,false);
            agf.GameMain.setPlayBtn();
            agf.GameAudio.play(IMGHOST + '/snd/games/playbtn/play.mp3', 'content');
        },

        //loop playbtn manually
        titlePlayBtnLoopEnd: function() {
            agf.GameAnimation.play(GameData.titleAnimation.playloop,'titlePlayBtnLoop',agf.GameVars.titleAnimation,null,false);
        },

        setPlayBtn: function() {
            var returnSprite = agf.GameAnimation.getElement(agf.GameAnimation.currentAnim, GameData.titleAnimation.playBtnInstance);
            agf.GameAnimation.playBtn = returnSprite;
            agf.GameAnimation.playBtn.div.style.backgroundSize = 'contain';
            agf.GameEvents.appendListener(agf.GameAnimation.playBtn,'startGame',agf.GameMain.playBtnClicked);
        },

        playBtnClicked: function(event) {
            agf.GameEvents.detachListener(getEventTarget(event),'startGame',agf.GameMain.playBtnClicked);
            agf.GameAudio.reset();
            agf.GameAnimation.play(GameData.titleAnimation.playout,'titlePlayBtnOutro',agf.GameVars.titleAnimation,null,false);
        },

        titlePlayBtnOutroEnd: function() {
            agf.GameMain.startRound();
        },

        startRound: function() {
            if (agf.GameVars.roundAnim) {
                agf.GameAnimation.remove(agf.GameVars.roundAnim);
                agf.GameVars.roundAnim = null;
            }
            agf.GameAnimation.load(GameData.roundData[agf.GameVars.roundNum].bookAnim, 'bookAnim', agf.GameVars.preload);
            agf.GameVars.bookAnim = agf.GameAnimation.currentAnim;
        },

        bookAnimReady: function() {
            agf.GameVars.seqCount = 0;
            agf.GameVars.roundPhase = 0;
            agf.GameAnimation.play(GameData.roundData[agf.GameVars.roundNum].bookPreloadSeq,'bookPreloadSeq',agf.GameVars.bookAnim,null,false);
        },

        bookPreloadSeqEnd: function() {
            if (agf.GameVars.titleAnimation) {
                agf.GameAnimation.remove(agf.GameVars.titleAnimation);
                agf.GameVars.titleAnimation = null;
            }
            if (agf.GameVars.roundAnim) {
                agf.GameAnimation.remove(agf.GameVars.roundAnim);
                agf.GameVars.roundAnim = null;
            }
            agf.GameAnimation.currentAnim.gotoAndStop(GameData.roundData[agf.GameVars.roundNum].bookPromptFrame);
            agf.GameVars.animationContainer.appendChild(agf.GameVars.bookAnim.mask);
            agf.GameAnimation.play(GameData.roundData[agf.GameVars.roundNum].bookPromptSeq,'bookPromptSeq',agf.GameVars.bookAnim,null,false);
        },

        bookPromptSeqEnd: function() {
            agf.GameAnimation.play(GameData.roundData[agf.GameVars.roundNum].bookSeq[agf.GameVars.seqCount],'bookTransSeq',agf.GameVars.bookAnim,null,false);
        },

        bookTransSeqEnd: function() {
            agf.GameVars.seqCount++;
            agf.GameAnimation.play(GameData.roundData[agf.GameVars.roundNum].bookSeq[agf.GameVars.seqCount],'bookDialSeq',agf.GameVars.bookAnim,null,false);  
        },

        bookDialSeqEnd: function() {
            agf.GameVars.seqCount++;
            agf.GameAnimation.play(GameData.roundData[agf.GameVars.roundNum].bookSeq[agf.GameVars.seqCount],'bookBtnSeq',agf.GameVars.bookAnim,null,false); 
            agf.GameAudio.play(agf.GameVars.sndUrl + 'sfx/' + GameData.sfx.highlight, 'effect'); 
        },

        bookBtnSeqEnd: function() {
            agf.GameVars.seqCount++;
            agf.GameEvents.addGameListeners();
        },

        roundAnimReady: function() {
            if (agf.GameVars.bookAnim) {
                agf.GameAnimation.remove(agf.GameVars.bookAnim);
                agf.GameVars.bookAnim = null;
            }
            agf.GameVars.seqCount = 0;
            agf.GameVars.roundPhase = 0;
            agf.GameAnimation.play(GameData.roundData[agf.GameVars.roundNum].phases[agf.GameVars.roundPhase].introSeq,'roundIntroSeq',agf.GameVars.roundAnim,null,false);  
        },

        roundIntroSeqEnd: function() {
            agf.GameAnimation.play(GameData.roundData[agf.GameVars.roundNum].phases[agf.GameVars.roundPhase].answerOptions[agf.GameVars.seqCount],'answerOptionsSeq',agf.GameVars.roundAnim,null,false);  
            agf.GameAudio.play(agf.GameVars.sndUrl + 'sfx/' + GameData.sfx.highlight, 'effect'); 
        },

        answerOptionsSeqEnd: function() {
            agf.GameVars.seqCount++;
            if (agf.GameVars.seqCount < GameData.roundData[agf.GameVars.roundNum].phases[agf.GameVars.roundPhase].answerOptions.length) {
                agf.GameAnimation.play(GameData.roundData[agf.GameVars.roundNum].phases[agf.GameVars.roundPhase].answerOptions[agf.GameVars.seqCount],'answerOptionsSeq',agf.GameVars.roundAnim,null,false);
                agf.GameAudio.play(agf.GameVars.sndUrl + 'sfx/' + GameData.sfx.highlight, 'effect'); 
            } else {
                agf.GameAnimation.currentAnim.gotoAndStop(GameData.roundData[agf.GameVars.roundNum].phases[agf.GameVars.roundPhase].returnToFrame);
                agf.GameMain.roundSetup();
            }
        },

        roundCAEnd: function() {
            if (agf.GameVars.roundPhase == 0) {
                agf.GameVars.roundPhase = 1;
                agf.GameVars.seqCount = 0;
                agf.GameAnimation.play(GameData.roundData[agf.GameVars.roundNum].phases[agf.GameVars.roundPhase].introSeq,'roundIntroSeq',agf.GameVars.roundAnim,null,false);  
            } else {
                agf.GameVars.roundNum++;
                if (agf.GameVars.roundNum < GameData.maxRounds) {
                    agf.GameAnimation.load(GameData.roundData[agf.GameVars.roundNum].bookAnim, 'bookAnim', agf.GameVars.preload);
                    agf.GameVars.bookAnim = agf.GameAnimation.currentAnim;
                } else {
                    agf.GameAnimation.load(GameData.affAnim, 'affAnim', agf.GameVars.animationContainer);
                    agf.GameVars.affAnim = agf.GameAnimation.currentAnim;
                }
            }
            //reset clickZone data
            agf.GameMain.resetForNextRound();
            
        },
        roundWAEnd: function() {
            agf.GameAnimation.currentAnim.gotoAndStop(GameData.roundData[agf.GameVars.roundNum].phases[agf.GameVars.roundPhase].returnToFrame);
            agf.GameInactivity.reset();
            agf.GameInactivity.start();
            if (agf.GameVars.swappedSprites.length > 0) {
                agf.GameAnimation.removeSwappedSprites(agf.GameVars.swappedSprites);
            }            
            agf.GameEvents.addGameListeners();
        },

        affAnimReady: function() {
            agf.GameAnimation.play(null,'affAnim',agf.GameVars.affAnim,null,false);
        },

        affAnimEnd: function() {
            agf.GameMain.endGame();
        },

        rolloverEnd: function() {
            agf.GameEvents.addGameListeners();
            agf.GameInactivity.start();
            agf.GameMain.resetRollover();
        },

        setRoundInactivity: function() {
            var inactivitySeq = GameData.roundData[agf.GameVars.roundNum].phases[agf.GameVars.roundPhase].inactivity;
            var playInactivitySeq = function() {
                agf.GameAnimation.play(inactivitySeq,'inactivity',agf.GameVars.roundAnim,null,false);
            };
            agf.CustomEvents.addCustomEvent('start',playInactivitySeq);
        },


        roundSetup: function() {
            agf.GameMain.setRoundInactivity();
            //set clickzones
            var clickzone;
            for (var i = 0; i < GameData.roundData[agf.GameVars.roundNum].phases[agf.GameVars.roundPhase].clickZones.length; i++) {
                clickzone = GameData.roundData[agf.GameVars.roundNum].phases[agf.GameVars.roundPhase].clickZones[i];
                clickzone.value = GameData.roundData[agf.GameVars.roundNum].phases[agf.GameVars.roundPhase].clickZones[i].value;
                clickzone.answerOption = GameData.roundData[agf.GameVars.roundNum].phases[agf.GameVars.roundPhase].answerOptions[i];
                clickzone.audioInstance = GameData.roundData[agf.GameVars.roundNum].phases[agf.GameVars.roundPhase].answerOptionsAudio[i];
                clickzone.inactive = GameData.roundData[agf.GameVars.roundNum].phases[agf.GameVars.roundPhase].inactivity;
                clickzone.instance = GameData.roundData[agf.GameVars.roundNum].phases[agf.GameVars.roundPhase].clickZones[i].instance;
                agf.GameVars.clickZones.push(clickzone);
            }
            agf.GameEvents.addGameListeners();
            agf.GameInactivity.start();
        },
            
        evaluate: function(userAnswer) {
            agf.GameInactivity.reset();
            agf.GameMain.resetRollover();
            
            var isMatching = agf.GameProgress.matchType(userAnswer.value, GameData.roundData[agf.GameVars.roundNum].phases[agf.GameVars.roundPhase].correctAnswer);
            if (isMatching){
                agf.GameVars.incorrectCount = 0;
                agf.GameAnimation.play(userAnswer.value,'roundCA',agf.GameVars.roundAnim,null,false);
                agf.GameAudio.play(agf.GameVars.sndUrl + 'sfx/' + GameData.sfx.correct, 'effect');

            } else {
                agf.GameVars.incorrectCount++;
                if (agf.GameVars.incorrectCount >= 4) {
                   agf.GameVars.incorrectCount = 0;
                    agf.GameAnimation.play(userAnswer.inactive,'roundWA',agf.GameVars.roundAnim,null,false);
                    agf.GameAnimation.swapImages(userAnswer.instance, [agf.GameVars.artUrl+userAnswer.value+'.png', agf.GameVars.artUrl+userAnswer.value+'.png'], agf.GameVars.roundAnim, agf.GameVars.swappedSprites, agf.GameVars.artUrl);
                } else {
                    agf.GameAnimation.play(userAnswer.value,'roundWA',agf.GameVars.roundAnim,null,false);
                }
                agf.GameAudio.play(agf.GameVars.sndUrl + 'sfx/' + GameData.sfx.incorrect, 'effect');
            }

        },

        resetAnimAudio: function(rollZone) {
            // grab audio instance
            var audioSprite;
            audioSprite = agf.GameAnimation.getElement(agf.GameAnimation.currentAnim, rollZone.audioInstance);
            // this is the key, if the audio player object exists. STOP that current audio player! 
            if(audioSprite.player) audioSprite.player.stop();
            // create a new player
            audioSprite.player = SoundControl.addContentSound(audioSprite.audioPath);
            // wait for new player object to load, then play sequence
            agf.GameEvents.appendListener(audioSprite.player, 'loaded', agf.GameMain.roSeqLoaded);
        },

        roSeqLoaded: function(event) {
            agf.GameEvents.detachListener(getEventTarget(event), 'loaded', agf.GameMain.roSeqLoaded);
            agf.GameAnimation.play(agf.GameVars.rolloverObj.answerOption, 'rollover', agf.GameVars.roundAnim, null, false);
            agf.GameEvents.addGameListeners();
        },

        playRollover: function(rollZone) {
            if (agf.GameVars.rolloverObj && agf.GameVars.rolloverObj.value == rollZone.value) {
                return;
            }
           
            agf.GameMain.resetRollover();
            agf.GameVars.rolloverObj = rollZone;
            agf.GameVars.rolloverTimeout = setTimeout(
                function() {
                    agf.GameInactivity.reset();
                    agf.GameEvents.removeGameListeners();
                    //reset anim audio
                    agf.GameMain.resetAnimAudio(rollZone);
                },GameData.roWaitTime);
        },
       
        resetRollover: function() {
            if (agf.GameVars.rolloverTimeout) {
                clearTimeout(agf.GameVars.rolloverTimeout);
                agf.GameVars.rolloverTimeout = 0;
            }

            if(agf.GameVars.rolloverObj) {
                agf.GameAnimation.stop();
                agf.GameAnimation.currentAnim.gotoAndStop(GameData.roundData[agf.GameVars.roundNum].phases[agf.GameVars.roundPhase].returnToFrame);
                var audioSprite;
                audioSprite = agf.GameAnimation.getElement(agf.GameAnimation.currentAnim, agf.GameVars.rolloverObj.audioInstance);
                if(audioSprite.player) audioSprite.player.stop();
                audioSprite.player = SoundControl.addContentSound(audioSprite.audioPath);
                agf.GameEvents.detachListener(audioSprite.player, 'loaded', agf.GameMain.roSeqLoaded);
            }
            agf.GameVars.rolloverObj = null;
        }, 

        resetForNextRound: function() {
            agf.GameInactivity.reset();
            agf.GameMain.resetRollover();
            //reset interactive objects
            if (agf.GameVars.clickZones.length > 0) {
                while (agf.GameVars.clickZones.length > 0) {
                    agf.GameVars.clickZones[agf.GameVars.clickZones.length-1] = null;
                    agf.GameVars.clickZones.pop();
                }
                agf.GameVars.clickZones = [];
            }
        },
 
        endGame: function() {
            agf.GameInactivity.reset();
            agf.GameVars.gameTracker.ticketMachine();
        },

        replayGame: function(event) {
            agf.GameEvents.detachListener(getEventTarget(event), 'doReplay', agf.GameMain.replayGame);
            agf.GameVars.onReplay = true;
            agf.GameMain.setGameTracker();
            agf.GameVars.roundNum = 0;
            agf.GameMain.resetRollover();
            agf.GameVars.roundPhase = 0;
            agf.GameVars.seqCount = 0;
            agf.GameMain.startRound();
        },

        
    };
    return agf.GameMain;
});
