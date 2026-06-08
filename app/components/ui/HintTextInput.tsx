import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";

type HintTextInputProps = TextInputProps & {
  placeholder: string;
  containerStyle?: ViewStyle;
};

/**
 */
export function HintTextInput({
  placeholder,
  value,
  containerStyle,
  style,
  placeholderTextColor: _ignored,
  ...rest
}: HintTextInputProps) {
  const showHint = value == null || String(value).length === 0;

  return (
    <View style={[styles.container, containerStyle]}>
      {showHint ? (
        <Text
          pointerEvents="none"
          style={styles.hint}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {placeholder}
        </Text>
      ) : null}
      <TextInput
        {...rest}
        value={value}
        placeholder=""
        style={[styles.input, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    minHeight: 24,
  },
  hint: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    textAlignVertical: "center",
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    letterSpacing: 0,
  },
  input: {
    flex: 1,
    minWidth: 0,
    width: "100%",
    padding: 0,
    margin: 0,
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
    letterSpacing: 0,
    textAlign: "left",
  },
});
