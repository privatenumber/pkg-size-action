import { setOutput } from '@actions/core';
import { regressionReportTemplate, headOnlyReportTemplate } from '../report-templates/index.js';
import comparePackages from './compare-packages.js';
import isBaseDiffFromHead from './is-base-diff-from-head.js';
import buildRef from './build-ref.js';
import * as log from './log.js';

async function generateSizeReport({
	pr,
	buildCommand,
	commentReport,
	mode,
	unchangedFiles,
	hideFiles,
	sortBy,
	sortOrder,
	displaySize,
}) {
	log.startGroup('Build HEAD');
	const headPkgData = await buildRef({
		refData: pr.head,
		buildCommand,
	});
	setOutput('headPkgData', headPkgData);
	log.endGroup();

	if (mode === 'head-only') {
		if (commentReport !== 'false') {
			return headOnlyReportTemplate({
				headPkgData,
				hideFiles,
				displaySize,
			});
		}
	}

	const { ref: baseRef } = pr.base;
	let basePkgData;
	if (await isBaseDiffFromHead(baseRef)) {
		log.info('HEAD is different from BASE. Triggering build.');
		log.startGroup('Build BASE');
		basePkgData = await buildRef({
			checkoutRef: baseRef,
			refData: pr.base,
			buildCommand,
		});
		log.endGroup();
	} else {
		log.info('HEAD is identical to BASE. Skipping base build.');
		basePkgData = {
			...headPkgData,
			ref: pr.base,
		};
	}
	setOutput('basePkgData', basePkgData);

	const pkgComparisonData = comparePackages(headPkgData, basePkgData, {
		sortBy,
		sortOrder,
		hideFiles,
	});
	setOutput('pkgComparisonData', pkgComparisonData);

	if (commentReport !== 'false') {
		return regressionReportTemplate({
			pkgComparisonData,
			unchangedFiles,
			displaySize,
		});
	}

	return false;
}

export default generateSizeReport;
