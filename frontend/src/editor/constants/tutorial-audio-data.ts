/**
 * Tutorial text and audio file mappings.
 * This is the SOURCE OF TRUTH for tutorial text.
 *
 * This file is intentionally kept free of React/browser dependencies
 * so it can be imported by the audio generation script.
 *
 * To regenerate audio after changing text:
 *   yarn generate-tutorial-audio
 */

export interface TutorialAudioStep {
  /** The text to be spoken */
  text: string;
  /** Audio filename, e.g. "base_01.mp3". Undefined if this step has no audio. */
  audioFile?: string;
}

export const baseTutorialAudioData: TutorialAudioStep[] = [
  {
    text: `Hi there! I'm Ravi, and this is a game I've been working on. Want to help me finish it? Click "Start Lesson" over here!`,
    audioFile: "base_01.mp3",
  },
  {
    text: `These buttons start and stop the game. When you play normal games you can't pause and rewind, but we're writing our own game! Rewinding makes it easier to see what's happening when the game doesn't work the way we expect it to.`,
    audioFile: "base_02.mp3",
  },
  {
    text: `Click the 'Play' button to start my game.`,
    audioFile: "base_03.mp3",
  },
  {
    text: `You can move the hero around with the arrow keys on the keyboard. Go ahead and try it!`,
    audioFile: "base_04.mp3",
  },
  {
    text: `Oops—you can't get to the exit yet! I need to make a bridge over the lava so the hero can walk across. Want to help me add the bridge? Click here to start the next lesson.`,
    audioFile: "base_05.mp3",
  },
  {
    text: `This is the stage - it's where we design our game world.`,
    audioFile: "base_06.mp3",
  },
  {
    text: `This is the character library. It shows all of the game pieces we've made. You get to draw your own, so they can be anything you want! I've already made dirt and lava since this is a cave game. To help our hero over the lava, we need to make a new bridge piece.`,
    audioFile: "base_07.mp3",
  },
  {
    text: `Go ahead and click on the + sign in the library and choose "Draw a new Character."`,
    audioFile: "base_08.mp3",
  },
  {
    text: `Use the tools on the left side to draw a piece of a bridge. It can look like anything you want, and you can always come back and change it later.`,
    audioFile: "base_09.mp3",
  },
  {
    text: `When you're done, click the blue Save button.`,
    audioFile: "base_10.mp3",
  },
  {
    text: `Nice! The bridge piece is in our library now. Move the mouse over it and drag it up into our game world to add it to our level. You can drag-and-drop pieces around the world to set it up the way you want.`,
    audioFile: "base_11.mp3",
  },
  {
    text: `If you make a mistake, click on the trash tool and then click a block you want to get rid of.`,
    audioFile: "base_12.mp3",
  },
  {
    text: "Drag five blocks out from the library to create a bridge over the lava.",
    audioFile: "base_13.mp3",
  },
  {
    text: `Let's see how your bridge does! Click 'Play' again and try using the arrow keys to walk over the lava. If you can't get to the other side, try moving the bridge pieces around.`,
    audioFile: "base_14.mp3",
  },
  {
    text: `Great job - you made it over! Next, we need to teach our hero to climb so he can get over that boulder. Click here to start the next lesson.`,
    audioFile: "base_15.mp3",
  },
  {
    text: `In Codako, rules define how the game works. Click the recording tool in the toolbar. We'll create a new rule that teaches our hero how to climb a boulder.`,
    audioFile: "base_16.mp3",
  },
  {
    text: `Okay, now click on our hero - we want to show him how to climb, so this rule is for him.`,
    audioFile: "base_17.mp3",
  },
  {
    text: `Perfect. See how the stage has been grayed out? When we're showing our hero a new rule, it's important to tell him what to pay attention to.`,
    audioFile: "base_18.mp3",
  },
  {
    text: `These handles let us expand the area our hero will look at. For this rule, it's important that there's a rock in front of him! Drag the right handle so it includes the rock he has to climb.`,
    audioFile: "base_19.mp3",
  },
  {
    text: `Great! Go ahead and drag the top handle up by one square, too. Since we're going to teach him to climb, he needs to make sure he has space above him.`,
    audioFile: "base_20.mp3",
  },
  {
    text: `Perfect. Now we're ready to show our hero what to do!`,
    audioFile: "base_21.mp3",
  },
  {
    text: `Whenever our hero is walking around, he'll look at the picture on the left and see if his surroundings are the same.`,
    audioFile: "base_23.mp3",
  },
  {
    text: `If they are, he'll follow the instructions we give him on the right!`,
    audioFile: "base_24.mp3",
  },
  {
    text: `To tell our hero to climb, click and drag him up one square and over one square, so he's standing on top of the rock.`,
    audioFile: "base_25.mp3",
  },
  {
    text: `Great! See how that created an instruction? Now he knows what he should do!`,
    audioFile: "base_26.mp3",
  },
  {
    text: `Click 'Save Recording' and let's try out your new rule.`,
    audioFile: "base_27.mp3",
  },
  {
    text: `Press 'Play'! If we did it right, our hero should climb the block now.`,
    audioFile: "base_28.mp3",
  },
  {
    text: `Wow that was great! We taught the hero how to climb up over the rock. Now we can use the arrow keys to get him to the exit.`,
    audioFile: "base_29.mp3",
  },
  {
    text: `Hmm... Since we're making a game we should probably make our hero wait to climb until you press the space bar. Want to help me change that?`,
    audioFile: "base_30.mp3",
  },
  {
    text: `Double-click on our hero and let's look at the rules we've taught him.`,
    audioFile: "base_31.mp3",
  },
  {
    text: `Each time our hero takes a step, he starts with the first rule and moves down the list. He looks at each one to see if his surroundings match the picture in that rule. If it does, he does what the rule tells him and stops.`,
    audioFile: "base_32.mp3",
  },
  {
    text: `Sometimes, we only want our hero to follow a rule if we press a key on the keyboard. That's what the green Event blocks are for! They tell our hero he should only look inside when we're pressing a key.`,
    audioFile: "base_33.mp3",
  },
  {
    text: `See? Here's the rule that tells our hero to walk right. You can tell the rule is showing him how to walk right, because the picture shows him starting in the left square, and ending in the right square.`,
    audioFile: "base_34.mp3",
  },
  {
    text: `That rule is inside a green block that says 'when the right arrow key is pressed.' Our hero will only think about walking right when we're pressing that key!`,
    audioFile: "base_35.mp3",
  },
  {
    text: `We taught our hero to climb, but we didn't tell him to wait for us to press a key. Our climbing rule is down at the bottom with the other rules our hero looks at when he's not busy.`,
    audioFile: "base_36.mp3",
  },
  {
    text: `We'll need a new green Event block. Click 'Add' up here.`,
    audioFile: "base_37.mp3",
  },
  {
    text: `Choose 'When a Key is Pressed' from the menu.`,
    audioFile: "base_38.mp3",
  },
  {
    text: `Okay. What key should make him jump? Maybe the space bar? Press a key you want to use and then click the "Done" button.`,
    audioFile: "base_39.mp3",
  },
  {
    text: `Great! There's our new green block. Let's put our climbing rule in there so the hero will only climb when we press that key.`,
    audioFile: "base_40.mp3",
  },
  {
    text: `Drag and drop the climbing rule into the empty space inside our new green block.`,
    audioFile: "base_41.mp3",
  },
  {
    // No audio for this step - it's a wait/continuation step
    text: `Drag and drop the climbing rule into the empty space inside our new green block.`,
    audioFile: undefined,
  },
  {
    text: `We've just told our hero that he should only climb when you press that key. Move the hero back to the left side of the stage and let's try this out!`,
    audioFile: "base_42.mp3",
  },
  {
    text: `Click the 'Play' button to start the game. Try climbing over the rock now.`,
    audioFile: "base_43.mp3",
  },
  {
    text: `Nice - it worked! This game is getting fun! Want to make it harder? I was thinking that boulder on the ledge could fall when the hero walks by.`,
    audioFile: "base_44.mp3",
  },
  {
    text: `This time, we need to teach the boulder a new rule. When the hero gets close, it should slip off the ledge and start to fall! Let's say the hero should be...`,
    audioFile: "base_45.mp3",
  },
  {
    text: `here when the boulder starts to fall. Remember how we created our first rule?`,
    audioFile: "base_46.mp3",
  },
  {
    text: `Switch to the recording tool again. This time, click on the boulder!`,
    audioFile: "base_47.mp3",
  },
  {
    text: `Perfect. See how the stage has grayed out? We want the boulder to slip when the hero is down below, so we need to include him in the rule. Can you expand the recording so our hero is inside the box?`,
    audioFile: "base_48.mp3",
  },
  {
    text: `Okay good!`,
    audioFile: "base_50.mp3",
  },
  {
    text: `To make our boulder fall off the ledge, drag it over by one square so it's in the air.`,
    audioFile: "base_51.mp3",
  },
  {
    text: `Great! Now the boulder will slip off the ledge when our hero walks over and the picture on the left matches!`,
    audioFile: "base_52.mp3",
  },
  {
    text: `Click 'Save Recording' and let's try out your new rule.`,
    audioFile: "base_53.mp3",
  },
  {
    text: `Press 'Play'! Walk the hero toward the boulder and let's see if it falls.`,
    audioFile: "base_54.mp3",
  },
  {
    text: `Hmm... The boulder moved over, but it didn't fall! I wonder what we forgot? Oh - I know! we made the boulder slip off the ledge, but we never programmed it to fall down!`,
    audioFile: "base_55.mp3",
  },
  {
    text: `In the real world, gravity makes everything fall down. In our game, we need to program things to fall. Maybe next time we can make a space game and we won't need gravity!`,
    audioFile: "base_56.mp3",
  },
  {
    text: `Switch to the recording tool again and click the boulder. Let's give it a gravity rule!`,
    audioFile: "base_57.mp3",
  },
  {
    text: `Perfect. Let's think about this for a minute.. We want our boulder to fall whenever there's an empty square beneath it. Can you expand the box to include the empty space beneath the boulder?`,
    audioFile: "base_58.mp3",
  },
  {
    text: `Nice. Now we're ready to show the boulder what to do.`,
    audioFile: "base_60.mp3",
  },
  {
    text: `In the picture on the right, drag the boulder down into the empty space just beneath it.`,
    audioFile: "base_61.mp3",
  },
  {
    text: `Nice! The boulder will fall down until it reaches the ground. Once it's on the ground the picture on the left won't match - there won't be any empty space for it to fall into!`,
    audioFile: "base_62.mp3",
  },
  {
    text: `Click 'Save Recording' and let's try out your new rule.`,
    audioFile: "base_63.mp3",
  },
  {
    text: `Okay let's try playing it again. This time when our hero walks toward the ledge, the boulder should slip off and fall! Can you get him past the boulder before it blocks his path?`,
    audioFile: "base_64.mp3",
  },
  {
    text: `That was pretty cool, huh? I don't really know what we should do next. Why don't you make your own rules! You could make our hero jump over the boulder or teach him to dig into the dirt, or create a whole new game piece!`,
    audioFile: "base_65.mp3",
  },
  {
    text: `That's it for the tutorial. If you want to learn more, you can find videos and other resources in the main menu!`,
    audioFile: "base_66.mp3",
  },
];

export const forkTutorialAudioData: TutorialAudioStep[] = [
  {
    text: `Hi there! I've copied this game to your account so you can edit it as much as you want. Want me to show you around?`,
    audioFile: "fork_01.mp3",
  },
  {
    text: `These buttons start and stop the game. When you play normal games you can't pause and rewind, but Codako let's you write our own games! Rewinding makes it easier to see what's happening when the game doesn't work the way you expect it to.`,
    audioFile: "fork_02.mp3",
  },
  {
    text: `This is the character library. It shows all of the game pieces we've made. You can draw your own or add existing ones by clicking the "+" icon.`,
    audioFile: "fork_03.mp3",
  },
  {
    text: `This is the stage - it's where we design our game world. You can drag and drop pieces around, and add new ones by dragging them from the character library.`,
    audioFile: "fork_04.mp3",
  },
  {
    text: `Rules define how the game works. You can double-click a character to see it's rules, and create new rules by choosing the recording tool in the toolbar and then clicking a piece on the stage.`,
    audioFile: "fork_05.mp3",
  },
  {
    text: `Go ahead and try changing the game! If you make a mistake, you can undo any change by pressing the Undo button.`,
    audioFile: "fork_06.mp3",
  },
  {
    text: `For more learning resources, look in the main menu.`,
    audioFile: "fork_07.mp3",
  },
];

export const tutorialAudioData = {
  base: baseTutorialAudioData,
  fork: forkTutorialAudioData,
};
