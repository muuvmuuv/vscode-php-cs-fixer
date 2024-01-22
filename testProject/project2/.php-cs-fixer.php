<?php

$finder = PhpCsFixer\Finder::create()
	->exclude('.*/')
	->exclude('vendor')
	->in(__DIR__);

return (new PhpCsFixer\Config())
	->setRules([
		'@PSR12' => true,
		'@Symfony' => true,
		'indentation_type' => true,
	])
	->setFinder($finder)
	->setLineEnding("\n")
	->setIndent("\t");
