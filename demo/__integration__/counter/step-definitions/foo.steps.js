// example

import { defineFeature, loadFeature } from "jest-cucumber";

// "shared functions"

function givenIHavePreviouslyCreatedAPassword(given, passwordValidator) {
  given("I have previously created a password", () => {
    passwordValidator.setPassword("1234");
  });
}

function whenIEnterMyPasswordCorrectly(when, passwordValidator) {
  when("I enter my password correctly", () => {
    const accessGranted = passwordValidator.validatePassword("1234");
    expect(accessGranted).toBe(true);
  });
}

// end "shared functions"

class PasswordValidator {
  setPassword(password) {
    this.password = password;
  }

  validatePassword(claimedPassword) {
    return this.password === claimedPassword;
  }
}

const feature = loadFeature(`${__dirname}/../features/foo.feature`);

defineFeature(feature, (test) => {
  const passwordValidator = new PasswordValidator();

  test("Entering a correct password", ({ given, when, then }) => {
    givenIHavePreviouslyCreatedAPassword(given, passwordValidator);

    whenIEnterMyPasswordCorrectly(when, passwordValidator);

    then("I should be granted access", () => {
      expect(true).toBe(true);
    });
  });
});
