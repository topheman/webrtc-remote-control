Feature: Counter

  Background: Connecting multiple remotes
    Given I visit demo home page
    And I visit master page
    And [master] triggers open event
    Then I open a new remote from master, it should trigger an open event on remote
    And [master] should receive remote.connect event
    And [master] remote lists should be "[0]"
    Then I open a new remote from master, it should trigger an open event on remote
    And [master] should receive remote.connect event
    And [master] remote lists should be "[0,0]"
    Then I open a new remote from master, it should trigger an open event on remote
    And [master] should receive remote.connect event
    And [master] remote lists should be "[0,0,0]"

  Scenario: Basic
    Given I reset the sessionStorage of every pages
    And I close every pages

  Scenario: Send events
    Given I click on increment 3 times on remote 0
    And I click on increment 5 times on remote 1
    And I click on decrement 2 times on remote 2
    Then [master] remote lists should be "[3,5,-2]"
    Given I reset the sessionStorage of every pages
    And I close every pages

  Scenario: Reconnection
    Given I reset the sessionStorage of every pages
    And I close every pages
