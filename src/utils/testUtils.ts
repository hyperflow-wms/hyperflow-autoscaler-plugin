import * as pathtool from 'path';
import * as fs from 'fs';
import Workflow from '../hyperflow/tracker/workflow';

export const createWorkflowFromFile = (directory: string): Workflow => {
  const wfFile = pathtool.join(directory, 'workflow.json');
  const wfFileContent = fs.readFileSync(wfFile, 'utf8');
  const rawWf = JSON.parse(wfFileContent);
  const wf = new Workflow('123', rawWf);

  return wf;
};
