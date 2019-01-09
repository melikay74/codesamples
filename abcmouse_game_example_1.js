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
        introAnim: null,
        roundAnim: null,
        transAnim: null,
        affAnim:null,
        roundPhase: 0,
        roundNum: 0,
        phaseCaCount: 0,
        roundPrompt: null,
        phasePrompt: null,
        instructPrompt: null,
        incorrectCount: 0,
        correctCount: 0,
        onReplay: false,
        snapTweenX: null,
        snapTweenY: null,
        seqCount: 0,
        clickables: [],
        swappedSprites:[],
        currClickObj: null,
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

            // if (event.type === 'touchend') {
            //     agf.GameVars.endTime = new Date().getTime();
            //     if (agf.GameVars.endTime - agf.GameVars.startTime > GameData.roWaitTime) {
            //         return;
            //     }
            // }
            for (var i = 0; i < agf.GameVars.clickables.length; i++) {
                _style = agf.GameProgress.getStyle(agf.GameVars.clickables[i]);
                hasCollision = agf.GameProgress.hitCheck(_pos,_style);
                if (hasCollision) {
                    agf.GameInactivity.reset();
                    agf.GameAudio.reset();
                    agf.GameEvents.removeGameListeners();
                    agf.GameVars.currClickObj = agf.GameVars.clickables[i];
                    agf.GameMain.evaluate(agf.GameVars.currClickObj);
                    return;
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
                
            }
        },

        onDownState: function(event) {
            var _pos = agf.GameProgress.getOffSets(event);
            var _style = null;
            if (event.type === 'touchstart') {
            
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
            agf.GameAnimation.load(GameData.introAnim, 'gameIntroAnim', agf.GameVars.animationContainer);
            agf.GameVars.introAnim = agf.GameAnimation.currentAnim;
        },

        gameIntroAnimReady: function() {
            if (agf.GameVars.titleAnimation) {
                agf.GameAnimation.remove(agf.GameVars.titleAnimation);
                agf.GameVars.titleAnimation = null;
            }
            agf.GameAnimation.play(null,'gameIntroAnim',agf.GameVars.introAnim,null,false);
        },

        gameIntroAnimEnd: function() {
            agf.GameMain.startRound();
        },

        startRound: function() {
            if (agf.GameVars.roundAnim) {
                agf.GameAnimation.remove(agf.GameVars.roundAnim);
                agf.GameVars.roundAnim = null;
            }
            if (agf.GameVars.affAnim) {
                agf.GameAnimation.remove(agf.GameVars.affAnim);
                agf.GameVars.affAnim = null;
            }
            if (agf.GameVars.onReplay) {
                agf.GameDomUtility.setSourceImage(agf.GameVars.animationCover, agf.GameVars.artUrl + GameData.roundBg + '.png');
                agf.GameVars.animationCover.style.display = 'block';
            }
            agf.GameAnimation.load(GameData.roundData[agf.GameVars.roundNum].roundAnim, 'roundAnim', agf.GameVars.animationContainer);
        },

        setPhasePrompt: function() {
            agf.GameVars.phasePrompt = agf.GameVars.sndUrl + GameData.roundData[agf.GameVars.roundNum].phasePrompt[agf.GameVars.roundPhase] + '.mp3';
        },

        roundAnimReady: function() {
            if (agf.GameVars.introAnim) {
                agf.GameAnimation.remove(agf.GameVars.introAnim);
                agf.GameVars.introAnim = null;
            }
            if (agf.GameVars.transAnim) {
                agf.GameAnimation.remove(agf.GameVars.transAnim);
                agf.GameVars.transAnim = null;
            }
            agf.GameVars.roundPhase = 0;
            agf.GameMain.setPhasePrompt();

            agf.GameAudio.play(agf.GameVars.sndUrl + GameData.roundData[agf.GameVars.roundNum].roundPrompt + '.mp3','roundPrompt');
            agf.GameVars.roundAnim = agf.GameAnimation.currentAnim;
            agf.GameAnimation.play(GameData.roundData[agf.GameVars.roundNum].phaseIntroSeq[agf.GameVars.roundPhase],'phaseIntroSeq',agf.GameVars.roundAnim,null,false);
        },

        phaseIntroSeqEnd: function() {
            if (agf.GameVars.roundPhase == 0) {
                agf.GameMain.roundSetup();
            } else {
                // agf.GameAudio.play(agf.GameVars.sndUrl + GameData.roundData[agf.GameVars.roundNum].instructPrompt + '.mp3', 'instructPrompt');
                agf.GameAudio.reset();
            agf.GameInactivity.reset();
            agf.GameInactivity.start();
            agf.GameEvents.addGameListeners();
            }
        },
        
        selectedEnd: function() {
            //play CA
            var correctAudio = agf.GameVars.responseUrl + 'good/' + new Date().getTime() + '.mp3';
            agf.GameAudio.play(correctAudio,'correctAnswer');
        },

        correctAnswerEnd: function() {
            agf.GameAnimation.play(GameData.roundData[agf.GameVars.roundNum].phaseCaSeq[agf.GameVars.roundPhase],'phaseCaSeq',agf.GameVars.roundAnim,null,false);
            agf.GameAnimation.removeSwappedSprites(agf.GameVars.swappedSprites);
        },

        wrongAnswerEnd: function() {
            agf.GameAnimation.removeSwappedSprites(agf.GameVars.swappedSprites);
            agf.GameEvents.addGameListeners();
            agf.GameAudio.reset();
            agf.GameInactivity.reset();
            agf.GameInactivity.start();
        },

        fourthIncorrectEnd: function() {
            if (agf.GameVars.roundPhase == 0) {
                agf.GameAudio.play(agf.GameVars.sndUrl + GameData.roundData[agf.GameVars.roundNum].instructPrompt + '.mp3', 'fourthIncorrectPartTwo');
            } else {
                agf.GameAnimation.removeSwappedSprites(agf.GameVars.swappedSprites);
                agf.GameAudio.reset();
                agf.GameInactivity.reset();
                agf.GameInactivity.start();
                agf.GameEvents.addGameListeners();    
            }    
        },

        fourthIncorrectPartTwoEnd: function() {
            agf.GameAnimation.removeSwappedSprites(agf.GameVars.swappedSprites);
            agf.GameAudio.reset();
            agf.GameInactivity.reset();
            agf.GameInactivity.start();
            agf.GameEvents.addGameListeners();
        },

        roundPromptEnd:function() {
            agf.GameAudio.play(agf.GameVars.sndUrl + GameData.roundData[agf.GameVars.roundNum].phasePrompt[agf.GameVars.roundPhase] + '.mp3', 'phasePrompt');
        },
        
        phasePromptEnd:function() {
            agf.GameAudio.play(agf.GameVars.sndUrl + GameData.roundData[agf.GameVars.roundNum].instructPrompt + '.mp3', 'instructPrompt');
        },

        instructPromptEnd: function() {
            agf.GameAudio.reset();
            agf.GameInactivity.reset();
            agf.GameInactivity.start();
            agf.GameEvents.addGameListeners();
        },

        phaseCaSeqEnd: function() {
            agf.GameVars.roundPhase++;
            agf.GameMain.setRoundInactivity();
            agf.GameInactivity.reset();
            agf.GameMain.setPhasePrompt();  
            if (agf.GameVars.phaseCaCount == GameData.roundData[agf.GameVars.roundNum].phaseCaSeq.length) {
                agf.GameVars.roundNum++;
                //load trans anim or aff anim
                agf.GameMain.resetForNextRound();
                if (agf.GameVars.roundNum < GameData.maxRounds) {
                    agf.GameAnimation.load(GameData.roundData[agf.GameVars.roundNum].roundTrans,'transAnim',agf.GameVars.animationContainer); 
                } else {
                    agf.GameAnimation.load(GameData.affAnim,'affAnim',agf.GameVars.animationContainer); 
                    agf.GameVars.affAnim = agf.GameAnimation.currentAnim;
                }
            } else {
                agf.GameMain.resetForNextPhase();
                agf.GameAnimation.play(GameData.roundData[agf.GameVars.roundNum].phaseIntroSeq[agf.GameVars.roundPhase],'phaseIntroSeq',agf.GameVars.roundAnim,null,false);
                agf.GameAudio.play(agf.GameVars.sndUrl + 'sfx/' + GameData.sfx.highlight,'effect');
            }
        },
        transAnimReady: function() {
            if (agf.GameVars.roundAnim) {
                agf.GameAnimation.remove(agf.GameVars.roundAnim);
                agf.GameVars.roundAnim = null;
            }
            agf.GameVars.transAnim = agf.GameAnimation.currentAnim;
            agf.GameAnimation.play(null,'transAnim', agf.GameVars.transAnim,null,false);
        },
        transAnimEnd: function() {
            agf.GameAnimation.load(GameData.roundData[agf.GameVars.roundNum].roundAnim, 'roundAnim', agf.GameVars.animationContainer);
            
        },
       
        affAnimReady: function() {
            if (agf.GameVars.roundAnim) {
                agf.GameAnimation.remove(agf.GameVars.roundAnim);
                agf.GameVars.roundAnim = null;
            }
            if (agf.GameVars.transAnim) {
                agf.GameAnimation.remove(agf.GameVars.transAnim);
                agf.GameVars.transAnim = null;
            }
            agf.GameAnimation.play(null,'affAnim',agf.GameVars.affAnim,null,false);
        },

        affAnimEnd: function() {
            agf.GameMain.endGame();
        },

        setRoundInactivity: function() {
            var inactivityUrl;
            if (agf.GameVars.roundPhase == 0) {
                inactivityUrl = agf.GameVars.phasePrompt;
                agf.CustomEvents.addCustomEvent('complete', agf.GameMain.playSecondInactivityAudio);
            } else {
                inactivityUrl = agf.GameVars.sndUrl + GameData.roundData[agf.GameVars.roundNum].instructPrompt + '.mp3';
            }
            agf.GameInactivity.setNewUrl(inactivityUrl);
        },

        playSecondInactivityAudio: function() {
            agf.CustomEvents.removeCustomEvent('complete',agf.GameMain.playSecondInactivityAudio);
            if(agf.GameVars.roundPhase == 0) {
                agf.GameAudio.play(agf.GameVars.sndUrl + GameData.roundData[agf.GameVars.roundNum].instructPrompt + '.mp3', 'secondInactivity');
            }
        },

        secondInactivityEnd: function() {
            agf.GameAudio.reset();
        },

        roundSetup: function() {
            agf.GameMain.setRoundInactivity();
            var clickable;
            var spriteObject;
            for (var i = 0; i < GameData.roundData[agf.GameVars.roundNum].clickables.length; i++) {
                spriteObject = agf.GameAnimation.getElement(agf.GameVars.roundAnim,GameData.roundData[agf.GameVars.roundNum].clickables[i].instance);
                var clickable = spriteObject.div;
                clickable.instance = GameData.roundData[agf.GameVars.roundNum].clickables[i].instance;
                clickable.value = GameData.roundData[agf.GameVars.roundNum].clickables[i].value;
                agf.GameVars.clickables.push(clickable);
            }
        },
            
        evaluate: function(userAnswer) {
            var isMatching = agf.GameProgress.matchType(userAnswer.value, GameData.roundData[agf.GameVars.roundNum].correctAnswer[agf.GameVars.roundPhase]);
            if (isMatching){
                agf.GameAudio.play(agf.GameVars.sndUrl + 'sfx/' + GameData.sfx.correct, 'effect');
                agf.GameVars.phaseCaCount++;
                agf.GameVars.incorrectCount = 0;
                agf.GameAnimation.swapImages(userAnswer.instance, 'ca_' + userAnswer.value, agf.GameVars.roundAnim, agf.GameVars.swappedSprites, agf.GameVars.artUrl);
                agf.GameAudio.play(agf.GameVars.sndUrl + agf.GameVars.currClickObj.value + '.mp3', 'selected');
            } else {
                var incorrectAudio;
                agf.GameVars.incorrectCount++;
                agf.GameAnimation.swapImages(userAnswer.instance, 'wa_' + userAnswer.value, agf.GameVars.roundAnim, agf.GameVars.swappedSprites, agf.GameVars.artUrl);
                if (agf.GameVars.incorrectCount >= 4) {
                    agf.GameVars.incorrectCount = 0;
                    if (agf.GameVars.roundPhase == 0) {
                        incorrectAudio = agf.GameVars.phasePrompt;
                    } else {
                        incorrectAudio = agf.GameVars.sndUrl + GameData.roundData[agf.GameVars.roundNum].instructPrompt + '.mp3';
                    }
                    agf.GameAudio.play(incorrectAudio,'fourthIncorrect');
                } else {
                    incorrectAudio = agf.GameVars.responseUrl + 'retry/' + new Date().getTime() + '.mp3';
                    agf.GameAudio.play(incorrectAudio,'wrongAnswer');
                }
                agf.GameAudio.play(agf.GameVars.sndUrl + 'sfx/' + GameData.sfx.incorrect, 'effect');
            }
        },

        resetForNextPhase: function() {
            // remove first 5 numbers from array
            agf.GameVars.clickables.splice(0, 5);
            agf.GameVars.correctCount = 0;
            agf.GameVars.incorrectCount = 0;

        },

        resetForNextRound: function() {
            // agf.GameInactivity.reset();
            agf.GameVars.phaseCaCount = 0;
          
            //reset interactive objects
            if (agf.GameVars.clickables.length > 0) {
                while (agf.GameVars.clickables.length > 0) {
                    agf.GameVars.clickables[agf.GameVars.clickables.length-1] = null;
                    agf.GameVars.clickables.pop();
                }
                agf.GameVars.clickables = [];
            }
        },
 
        endGame: function() {
            // agf.GameInactivity.reset();
            agf.GameVars.gameTracker.ticketMachine();
        },

        replayGame: function(event) {
            agf.GameEvents.detachListener(getEventTarget(event), 'doReplay', agf.GameMain.replayGame);
            agf.GameVars.onReplay = true;
            agf.GameMain.setGameTracker();
            agf.GameVars.roundNum = 0;
            agf.GameVars.roundPhase = 0;
            agf.GameMain.startRound();
        },

        
    };
    return agf.GameMain;
});
