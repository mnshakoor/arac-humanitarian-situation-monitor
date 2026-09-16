export const CONFIG = {
  appName: 'ARAC Humanitarian Situation Monitor',
  version: '0.7.0-beta',
  snapshotUrl: './data/snapshot.json',
  defaultWindow: '30d',
  lowBase: {
    minCurrent: 10,
    minAbsoluteIncrease: 5,
    minPercentIncrease: 30
  },
  hisiWeights: {
    volume: 0.30,
    momentum: 0.30,
    sourceDiversity: 0.20,
    themeBreadth: 0.20
  }
};
