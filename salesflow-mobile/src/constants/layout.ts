import { Dimensions } from 'react-native';

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').height;

export const IS_SMALL_DEVICE = SCREEN_WIDTH < 375;
export const IS_TABLET = SCREEN_WIDTH >= 768;

