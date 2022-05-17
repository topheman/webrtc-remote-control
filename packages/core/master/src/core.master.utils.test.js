/* eslint-disable no-plusplus */
import { processPollingData } from "./core.master.utils";

function timeSeries(nb = 0, startIndex = 0) {
  const originalTime = new Date("2022-05-08T10:00:00.000Z");
  const result = [];
  for (let i = startIndex; i < startIndex + nb; i++) {
    result.push(new Date(originalTime.getTime() + 1000 * i));
  }
  return result;
}

function mockData(
  connNb = 1,
  pollingData = timeSeries(1),
  { disconnect = () => {} } = {}
) {
  const connections = new Array(connNb).fill(0).map((_, index) => ({
    peer: index,
    disconnect: () => {
      // accept a mock + inject the index to be able to identifie which remote disconnected
      disconnect(index);
    },
  }));
  const pollingDataPrepared = connections.map(({ peer }) => [
    peer,
    pollingData,
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
        expect(mockData(2, timeSeries(3))).toMatchObject({
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
        expect(
          mockData(1, [
            ...timeSeries(2),
            "PAUSE",
            ...timeSeries(2, 2),
            "RESUME",
            ...timeSeries(2, 4),
          ])
        ).toMatchObject({
          connections: [{ peer: 0, disconnect: expect.any(Function) }],
          pollingData: new Map([
            [
              0,
              [
                new Date("2022-05-08T10:00:00.000Z"),
                new Date("2022-05-08T10:00:01.000Z"),
                "PAUSE",
                new Date("2022-05-08T10:00:02.000Z"),
                new Date("2022-05-08T10:00:03.000Z"),
                "RESUME",
                new Date("2022-05-08T10:00:04.000Z"),
                new Date("2022-05-08T10:00:05.000Z"),
              ],
            ],
          ]),
        });
      });
      it("check mockData with mocked disconnect", () => {
        const disconnect = jest.fn();
        const { connections } = mockData(2, timeSeries(3), {
          disconnect,
        });
        connections[1].disconnect();
        expect(disconnect).toHaveBeenCalledWith(1);
      });
    });
    describe("reduceData", () => {
      it("should remove any Date() below PAUSE if no RESUME above (and at least one Date above)", () => {
        const { pollingData } = mockData(1, [
          ...timeSeries(2),
          "PAUSE",
          ...timeSeries(2, 2),
        ]);
        processPollingData(pollingData);
        expect(pollingData).toMatchObject(
          new Map([
            [
              0,
              [
                "PAUSE",
                new Date("2022-05-08T10:00:02.000Z"),
                new Date("2022-05-08T10:00:03.000Z"),
              ],
            ],
          ])
        );
      });
      it("should not remove any Date() below RESUME if no PAUSE above (and at least one Date above)", () => {
        const { pollingData } = mockData(1, [
          ...timeSeries(2),
          "RESUME",
          ...timeSeries(2, 2),
        ]);
        processPollingData(pollingData);
        expect(pollingData).toMatchObject(
          new Map([
            [
              0,
              [
                "RESUME",
                new Date("2022-05-08T10:00:02.000Z"),
                new Date("2022-05-08T10:00:03.000Z"),
              ],
            ],
          ])
        );
      });
      it("should remove first entries and leave the last 3", () => {
        const { pollingData } = mockData(1, [...timeSeries(10)]);
        processPollingData(pollingData);
        expect(pollingData).toMatchObject(
          new Map([
            [
              0,
              [
                new Date("2022-05-08T10:00:07.000Z"),
                new Date("2022-05-08T10:00:08.000Z"),
                new Date("2022-05-08T10:00:09.000Z"),
              ],
            ],
          ])
        );
      });
    });
  });
});
