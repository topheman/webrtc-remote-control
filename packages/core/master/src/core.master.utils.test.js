/* eslint-disable no-plusplus */
// import { processPollingData } from "./core.master.utils";

function timeSeries(nb = 0) {
  const originalTime = new Date("2022-05-08T10:00:00.000Z");
  const result = [];
  for (let i = 0; i < nb; i++) {
    result.push(new Date(originalTime.getTime() + 1000 * i));
  }
  return result;
}

function mockData({ connNb = 1, pollingNb = 1, disconnect } = {}) {
  const connections = new Array(connNb).fill(0).map((_, index) => ({
    peer: index,
    disconnect: () => {
      // accept a mock + inject the index to be able to identifie which remote disconnected
      disconnect(index);
    },
  }));
  const pollingDataPrepared = connections.map(({ peer }) => [
    peer,
    timeSeries(pollingNb),
  ]);
  return {
    connections,
    pollingData: new Map(pollingDataPrepared),
  };
}

describe("core.master.utils", () => {
  describe("processPollingData", () => {
    describe("verify mocks", () => {
      it("check timeSeries", () => {
        expect(timeSeries()).toStrictEqual([]);
        expect(timeSeries(3)).toStrictEqual([
          new Date("2022-05-08T10:00:00.000Z"),
          new Date("2022-05-08T10:00:01.000Z"),
          new Date("2022-05-08T10:00:02.000Z"),
        ]);
      });
      it("check mockData", () => {
        expect(mockData()).toMatchObject({
          connections: [{ peer: 0, disconnect: expect.any(Function) }],
          pollingData: new Map([[0, [new Date("2022-05-08T10:00:00.000Z")]]]),
        });
        expect(mockData({ connNb: 2, pollingNb: 3 })).toMatchObject({
          connections: [
            { peer: 0, disconnect: expect.any(Function) },
            { peer: 1, disconnect: expect.any(Function) },
          ],
          pollingData: new Map([
            [
              0,
              [
                new Date("2022-05-08T10:00:00.000Z"),
                new Date("2022-05-08T10:00:01.000Z"),
                new Date("2022-05-08T10:00:02.000Z"),
              ],
            ],
            [
              1,
              [
                new Date("2022-05-08T10:00:00.000Z"),
                new Date("2022-05-08T10:00:01.000Z"),
                new Date("2022-05-08T10:00:02.000Z"),
              ],
            ],
          ]),
        });
      });
      it("check mockData with mocked disconnect", () => {
        const disconnect = jest.fn();
        const { connections } = mockData({
          connNb: 2,
          pollingNb: 3,
          disconnect,
        });
        connections[1].disconnect();
        expect(disconnect).toHaveBeenCalledWith(1);
      });
    });
  });
});
